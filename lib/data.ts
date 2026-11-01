import { parseFilters } from './validation';
import 'server-only';
import { cache } from 'react';
import { configured } from './config';
import { publicDb } from './supabase/public';
import { isCurrent, today, type Job } from './jobs';
import { sampleJobs, expiredSample, emailSample } from './sample-jobs';
import { cachedPublicJob, cachedSimilarJobs, MissingPublicJob } from './public-job-cache';
import {
  publicJobRow,
  PUBLIC_JOB_COLUMNS,
  type PublicJob,
  type JobCardData,
} from './public-job-fields';
import { requestPerformance } from './request-performance';
export type Filters = {
  q?: string;
  state?: string;
  location?: string;
  qualification?: string;
  experience_level?: string;
  job_type?: string;
  category?: string;
  work_mode?: string;
  sort?: string;
  page?: string;
};
export const demo = () => !configured && process.env.DEMO_MODE === 'true';
export function filterJobs(jobs: Job[], f: Filters) {
  let result = jobs.filter(isCurrent);
  if (f.q) {
    const q = f.q.toLowerCase();
    result = result.filter((j) =>
      [j.title, j.company_name, j.location, j.category].join(' ').toLowerCase().includes(q),
    );
  }
  for (const key of [
    'state',
    'location',
    'qualification',
    'experience_level',
    'job_type',
    'category',
    'work_mode',
  ] as const) {
    if (f[key]) result = result.filter((j) => j[key].toLowerCase() === f[key]!.toLowerCase());
  }
  return result.sort((a, b) =>
    f.sort === 'last_date'
      ? (a.last_date || '9999').localeCompare(b.last_date || '9999')
      : (b.published_at || '').localeCompare(a.published_at || ''),
  );
}
export async function listJobs(
  f: Filters = {},
  pageSize = 20,
): Promise<{ jobs: PublicJob[]; count: number }> {
  f = parseFilters(f);
  const page = Math.max(1, Math.min(10000, Number(f.page) || 1));
  if (demo()) {
    const jobs = filterJobs([...sampleJobs, expiredSample], f);
    return {
      jobs: jobs.slice((page - 1) * pageSize, page * pageSize).map(publicJobRow),
      count: jobs.length,
    };
  }
  if (!configured) return { jobs: [], count: 0 };
  const db = publicDb();
  let query = db
    .rpc('search_public_jobs', { p_query: f.q || null }, { count: 'exact' })
    .select(PUBLIC_JOB_COLUMNS);
  for (const key of [
    'state',
    'location',
    'qualification',
    'experience_level',
    'job_type',
    'category',
    'work_mode',
  ] as const)
    if (f[key]) query = query.ilike(key, f[key]!.replace(/[%_]/g, ''));
  query =
    f.sort === 'last_date'
      ? query.order('last_date', { ascending: true, nullsFirst: false })
      : query.order('published_at', { ascending: false });
  const { data, count, error } = await query.range((page - 1) * pageSize, page * pageSize - 1);
  if (error?.code === 'PGRST103' && page > 1) {
    // PostgREST returns 416 for an offset beyond the matching total. Preserve
    // filters/count instead of treating it as an outage or returning page 1.
    const firstPage = await listJobs({ ...f, page: '1' }, 1);
    return { jobs: [], count: firstPage.count };
  }
  if (error) throw error;
  return { jobs: ((data as unknown as unknown[]) || []).map(publicJobRow), count: count || 0 };
}
export const getJob = cache(async (slug: string): Promise<PublicJob | null> => {
  if (demo()) {
    const job = [...sampleJobs, expiredSample, emailSample].find((j) => j.slug === slug);
    return job ? publicJobRow(job) : null;
  }
  if (!configured) return null;
  try {
    return await requestPerformance().measure('public.job.read', () => cachedPublicJob(slug));
  } catch (error) {
    if (error instanceof MissingPublicJob) return null;
    throw error;
  }
});
export async function similarJobs(category: string): Promise<JobCardData[]> {
  if (demo()) return filterJobs([...sampleJobs, expiredSample], { category }).slice(0, 4);
  if (!configured) return [];
  return requestPerformance().measure('public.similar.read', () =>
    cachedSimilarJobs(category, today()),
  );
}
