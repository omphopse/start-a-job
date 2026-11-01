import { today } from './jobs';
export function jobDefaultValidDays(value = process.env.JOB_DEFAULT_VALID_DAYS): number {
  if (value == null || value === '') return 30;
  if (!/^\d+$/.test(value) || Number(value) > 3650)
    throw new Error(
      'JOB_DEFAULT_VALID_DAYS must be an integer from 0 to 3650 (0 disables the default).',
    );
  return Number(value);
}
export function defaultClosingDate(days: number, date = today()): string | null {
  if (!days) return null;
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}
export const resolveClosingDate = (
  value: string | null,
  days = jobDefaultValidDays(),
  date = today(),
) => value || defaultClosingDate(days, date);
