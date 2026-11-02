import { z } from 'zod';

// Provider spellings and historical aliases converge before saving or filtering.
// Keep the SQL normalizer generated from this map (see the migration test).
export const locationAliases: Record<string, string> = {
  india: 'India',
  bharat: 'India',
  'united states': 'United States',
  usa: 'United States',
  'united kingdom': 'United Kingdom',
  uk: 'United Kingdom',
  canada: 'Canada',
  bangalore: 'Bengaluru',
  bengaluru: 'Bengaluru',
  bombay: 'Mumbai',
  mumbai: 'Mumbai',
  calcutta: 'Kolkata',
  kolkata: 'Kolkata',
  madras: 'Chennai',
  chennai: 'Chennai',
  orissa: 'Odisha',
  odisha: 'Odisha',
  pondicherry: 'Puducherry',
  puducherry: 'Puducherry',
  karnataka: 'Karnataka',
  maharashtra: 'Maharashtra',
  telangana: 'Telangana',
  'tamil nadu': 'Tamil Nadu',
  'uttar pradesh': 'Uttar Pradesh',
  delhi: 'Delhi',
  gujarat: 'Gujarat',
  'west bengal': 'West Bengal',
  rajasthan: 'Rajasthan',
  pune: 'Pune',
  hyderabad: 'Hyderabad',
  noida: 'Noida',
  ahmedabad: 'Ahmedabad',
  jaipur: 'Jaipur',
};
export function normalizeLocationName(value: string): string {
  const clean = value.normalize('NFC').trim().replace(/\s+/gu, ' ');
  return Object.hasOwn(locationAliases, clean.toLowerCase())
    ? locationAliases[clean.toLowerCase()]
    : clean;
}
export const locationName = z
  .string()
  .trim()
  .max(100)
  .regex(/^[\p{L}\p{M}\p{N} .,'’()&-]*$/u)
  .transform(normalizeLocationName);
export type LocationFacet = { country: string; state: string; city: string; job_count: number };
export function normalizeFacets(rows: LocationFacet[]): LocationFacet[] {
  const groups = new Map<string, LocationFacet>();
  for (const row of rows) {
    const normalized = {
      country: normalizeLocationName(row.country),
      state: normalizeLocationName(row.state),
      city: normalizeLocationName(row.city),
      job_count: Number(row.job_count),
    };
    const key = JSON.stringify([
      normalized.country.toLowerCase(),
      normalized.state.toLowerCase(),
      normalized.city.toLowerCase(),
    ]);
    const old = groups.get(key);
    if (old) old.job_count += normalized.job_count;
    else groups.set(key, normalized);
  }
  return [...groups.values()];
}
// Resolve casing against actual database options; unknown names remain nonmatching filters.
export function resolveLocationFilters<
  T extends { country?: string; state?: string; city?: string },
>(filters: T, rows: LocationFacet[]): T {
  const next = { ...filters };
  for (const field of ['country', 'state', 'city'] as const) {
    if (next[field])
      next[field] =
        rows.find(
          (row) =>
            (!next.country ||
              field === 'country' ||
              row.country.toLowerCase() === next.country.toLowerCase()) &&
            (!next.state ||
              field !== 'city' ||
              row.state.toLowerCase() === next.state.toLowerCase()) &&
            row[field].toLowerCase() === next[field]!.toLowerCase(),
        )?.[field] || next[field];
  }
  return next;
}
