import 'server-only';
import { cache } from 'react';
import { configured } from './config';
import { publicDb } from './supabase/public';
import { demo, listJobs } from './data';
import { sampleJobs } from './sample-jobs';
import { isCurrent } from './jobs';
import { normalizeFacets, type LocationFacet } from './location-names';
export const locationFacets = cache(
  async (): Promise<{ rows: LocationFacet[]; remoteCount: number }> => {
    if (demo())
      return {
        rows: normalizeFacets(
          sampleJobs
            .filter(isCurrent)
            .map((job) => ({
              country: job.country || 'India',
              state: job.state,
              city: job.location,
              job_count: 1,
            })),
        ),
        remoteCount: sampleJobs.filter((job) => isCurrent(job) && job.work_mode === 'remote')
          .length,
      };
    if (!configured) return { rows: [], remoteCount: 0 };
    const [facets, remote] = await Promise.all([
      publicDb().rpc('public_job_location_facets', { p_limit: 500 }),
      listJobs({ work_mode: 'remote' }, 1),
    ]);
    if (facets.error) throw facets.error;
    return { rows: normalizeFacets(facets.data || []), remoteCount: remote.count };
  },
);
