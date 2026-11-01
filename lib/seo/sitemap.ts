import { listJobs } from '../data';
import type { PublicJob } from '../public-job-fields';
export async function allCurrentJobs() {
  const result: PublicJob[] = [];
  let page = 1;
  while (page <= 1000) {
    const { jobs, count } = await listJobs({ page: String(page) }, 100);
    result.push(...jobs);
    if (result.length >= count || jobs.length === 0) break;
    page++;
  }
  return result;
}
