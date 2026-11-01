import 'server-only';
import { unstable_cache } from 'next/cache';
import { configured } from './config';
import { publicDb } from './supabase/public';
import { defaultCategories } from './job-options';
import { createPerformanceTrace } from './performance';
// Public reference data only: never cache sessions, profiles or private jobs.
export const listCategories = unstable_cache(
  async (): Promise<string[]> => {
    if (!configured) return defaultCategories;
    const timing = createPerformanceTrace('categories-cache-fill');
    const { data, error } = await timing.measure('query.categories', () =>
      publicDb(timing.fetch).from('categories').select('name').order('name'),
    );
    if (error) {
      if (error.code === 'PGRST205' || error.code === '42P01') return defaultCategories;
      throw error;
    }
    return data.map((row) => row.name);
  },
  ['categories', process.env.NEXT_PUBLIC_SUPABASE_URL || 'unconfigured'],
  {
    revalidate: 300,
    tags: ['categories'],
  },
);
