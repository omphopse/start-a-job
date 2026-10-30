import { parseFilters } from './validation';
import 'server-only';
import { configured } from './config';
import { publicDb } from './supabase/public';
import { isCurrent, today, type Job } from './jobs';
import { sampleJobs, expiredSample } from './sample-jobs';
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
): Promise<{ jobs: Job[]; count: number }> {
  f = parseFilters(f);
  const page = Math.max(1, Math.min(10000, Number(f.page) || 1));
  if (demo()) {
    const jobs = filterJobs([...sampleJobs, expiredSample], f);
    return { jobs: jobs.slice((page - 1) * pageSize, page * pageSize), count: jobs.length };
  }
  if (!configured) return { jobs: [], count: 0 };
  let query = publicDb()
    .from('jobs')
    .select('*', { count: 'exact' })
    .eq('status', 'published')
    .or(`last_date.is.null,last_date.gte.${today()}`);
  if (f.q)
    query = query.textSearch('search_document', f.q, { type: 'websearch', config: 'english' });
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
  if (error) throw error;
  return { jobs: data as Job[], count: count || 0 };
}
export async function getJob(slug: string): Promise<Job | null> {
  if (demo()) return [...sampleJobs, expiredSample].find((j) => j.slug === slug) || null;
  if (!configured) return null;
  const db = publicDb();
  const { data, error } = await db
    .from('jobs')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (error) throw error;
  if (data) return data as Job;
  const expired = await db.rpc('get_expired_job', { p_slug: slug });
  if (expired.error) throw expired.error;
  return (expired.data?.[0] as Job) || null;
}
