import { configured } from './config';
import { publicDb } from './supabase/public';
import { createPerformanceTrace } from './performance';
import { createTombstoneCache } from './tombstone-cache';

// This is an anonymous public tombstone, not an authentication decision.
// Keep HTTP 410 semantics without a database round trip on every proxy hit.
const tombstones = createTombstoneCache(async (slug: string): Promise<boolean> => {
  if (!configured) return process.env.DEMO_MODE === 'true' && slug === 'deleted-sample-job';
  const timing = createPerformanceTrace('public-tombstone-cache-fill');
  const { data, error } = await timing.measure('query.deletedJob', () =>
    publicDb(timing.fetch).from('deleted_jobs').select('slug').eq('slug', slug).maybeSingle(),
  );
  if (error) throw error;
  return Boolean(data);
});
export const isDeletedJob = tombstones.read;
// Eager local eviction when the deployment shares this module instance.
// Separate proxy workers still expire their entries within ten seconds.
export const clearDeletedJobCache = tombstones.clear;
