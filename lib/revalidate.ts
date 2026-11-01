import 'server-only';
import { revalidatePath, revalidateTag } from 'next/cache';
import { publicJobsTag } from './public-job-fields';
import { clearDeletedJobCache } from './deleted-job-cache';
export function refreshJobs(slug?: string) {
  // Blocking expiry: a mutation must not serve stale public job content.
  // This also expires similar-job cards in the shared cache.
  revalidateTag(publicJobsTag, { expire: 0 });
  clearDeletedJobCache(slug);
  for (const path of [
    '/',
    '/jobs',
    '/admin',
    '/sitemap.xml',
    '/sitemaps/jobs.xml',
    '/sitemaps/categories.xml',
    '/feed.xml',
    '/api/public/jobs.json',
  ])
    revalidatePath(path);
  if (slug) revalidatePath(`/jobs/${slug}`);
  else revalidatePath('/jobs/[slug]', 'page');
  revalidatePath('/jobs/category/[category]', 'page');
  revalidatePath('/jobs/location/[location]', 'page');
  revalidatePath('/jobs/category/[category]/location/[location]', 'page');
}
