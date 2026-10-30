import 'server-only';
import { listJobs, type Filters } from './data';
import { configured } from './config';
import { publicDb } from './supabase/public';
import { allCurrentJobs } from './seo/sitemap';
import { slugify } from './validation';
export async function landingData(
  categorySlug?: string,
  locationSlug?: string,
  extra: Filters = {},
) {
  const all = await allCurrentJobs();
  const categories = [
    'Data entry',
    'Customer support',
    'Accounts',
    'HR',
    'Administration',
    'Government',
  ];
  const category = categorySlug ? categories.find((c) => slugify(c) === categorySlug) : undefined;
  if (categorySlug && !category) return null;
  const locations = [...new Set(all.flatMap((j) => [j.location, j.state]))];
  const location = locationSlug
    ? locations.find((l) => slugify(l) === locationSlug) ||
      locationSlug.replaceAll('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : undefined;
  const locationField = location && all.some((j) => j.state === location) ? 'state' : 'location';
  const base: Filters = {
    ...(category ? { category } : {}),
    ...(location ? { [locationField]: location } : {}),
  };
  const filters = { ...extra, ...base };
  const result = await listJobs(filters);
  const path = categorySlug
    ? `/jobs/category/${categorySlug}${locationSlug ? `/location/${locationSlug}` : ''}`
    : `/jobs/location/${locationSlug}`;
  const title = `${category || 'Fresher'} jobs${location ? ` in ${location}` : ' across India'}`;
  let intro = `Explore ${category ? category.toLowerCase() : 'fresher-friendly desk and office'} opportunities${location ? ` in ${location}` : ' across India'}. Compare qualifications, work arrangements and application deadlines, then follow the official source link. Browsing and applying through DeskJobs is always free.`;
  if (configured) {
    const { data, error } = await publicDb()
      .from('landing_pages')
      .select('intro')
      .eq('path', path)
      .maybeSingle();
    if (error) throw error;
    if (data) intro = data.intro;
  }
  const activeFilters = Object.entries(filters).filter(
    ([k, v]) => v && !['page', 'sort'].includes(k),
  ).length;
  return {
    ...result,
    path,
    title,
    intro,
    category,
    location,
    categories,
    locations,
    filters,
    noindex: result.count === 0 || activeFilters > 2,
    parent: categorySlug && locationSlug ? `/jobs/category/${categorySlug}` : '/jobs',
  };
}
