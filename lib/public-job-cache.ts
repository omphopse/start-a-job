import 'server-only';
import { unstable_cache } from 'next/cache';
import { publicDb } from './supabase/public';
import { today } from './jobs';
import {
  PUBLIC_JOB_COLUMNS,
  publicJobRow,
  publicJobsTag,
  type PublicJob,
  type JobCardData,
} from './public-job-fields';
import { createPerformanceTrace } from './performance';

// Throwing prevents negative/error results from entering the shared data cache.
// The caller maps only this sentinel to a missing record; backend errors propagate.
export class MissingPublicJob extends Error {}

export const cachedPublicJob = unstable_cache(
  async (slug: string): Promise<PublicJob> => {
    const timing = createPerformanceTrace('public-job-cache-fill');
    const db = publicDb(timing.fetch);
    const { data, error } = await timing.measure('query.publicJob', () =>
      db.rpc('get_public_job', { p_slug: slug }).select(PUBLIC_JOB_COLUMNS).maybeSingle(),
    );
    if (error) throw error;
    if (data) return publicJobRow(data);
    // Preserve the existing noindex expired page, using the narrowly scoped
    // existing RPC which returns only published jobs whose deadline has passed.
    const expired = await timing.measure('query.expiredPublicJob', () =>
      db.rpc('get_expired_job', { p_slug: slug }).select(PUBLIC_JOB_COLUMNS),
    );
    if (expired.error) throw expired.error;
    if (expired.data?.[0]) return publicJobRow(expired.data[0]);
    throw new MissingPublicJob();
  },
  ['public-job-v3-private-metadata', process.env.NEXT_PUBLIC_SUPABASE_URL || 'unconfigured'],
  {
    revalidate: 60,
    tags: [publicJobsTag],
  },
);

export const cachedSimilarJobs = unstable_cache(
  async (category: string, date: string): Promise<JobCardData[]> => {
    const timing = createPerformanceTrace('similar-jobs-cache-fill');
    const { data, error } = await timing.measure('query.similarJobs', () =>
      publicDb(timing.fetch)
        .rpc('search_public_jobs', { p_query: null })
        .select(PUBLIC_JOB_COLUMNS)
        .eq('category', category)
        .or(`last_date.is.null,last_date.gte.${date || today()}`)
        .order('published_at', { ascending: false })
        .limit(4),
    );
    if (error) throw error;
    return data as unknown as JobCardData[];
  },
  [
    'public-similar-jobs-v2-private-metadata',
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'unconfigured',
  ],
  {
    revalidate: 60,
    tags: [publicJobsTag],
  },
);
