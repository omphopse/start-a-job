import { locationName } from './location-names';
import { getApplicationMethod } from './application-method';
import { z } from 'zod';
import type { PublicJob } from './public-job-fields';
import { site } from './config';
const currentApiQuery = z
  .object({
    q: z.string().max(120).optional(),
    country: locationName.optional(),
    state: locationName.optional(),
    city: locationName.optional(),
    work_mode: z.enum(['office', 'hybrid', 'remote']).optional(),
    sort: z.enum(['newest', 'last_date']).optional(),
    category: z.string().max(80).optional(),
    job_type: z.enum(['full-time', 'part-time', 'internship', 'contract']).optional(),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();
// Retired parameters are ignored even when their values are malformed.
export const apiQuery = z.preprocess((input) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input;
  const { qualification, experience_level, ...current } = input as Record<string, unknown>;
  void qualification;
  void experience_level;
  return current;
}, currentApiQuery);
export function publicJob(j: PublicJob) {
  const method = getApplicationMethod(j);
  return {
    id: j.id,
    slug: j.slug,
    title: j.title,
    company: j.company_name,
    location: j.location,
    state: j.state,
    country: j.country || 'India',
    work_mode: j.work_mode,
    qualification: j.qualification,
    experience_level: j.experience_level,
    job_type: j.job_type,
    category: j.category,
    salary_text: j.salary_text,
    last_date: j.last_date,
    posted_at: j.published_at,
    source_apply_url: method?.kind === 'url' ? method.url : null,
    application_email: j.application_email ?? null,
    canonical_url: `${site.url}/jobs/${j.slug}`,
    summary: j.summary,
  };
}
export const publicHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control': 'public, max-age=0, must-revalidate',
  'X-Content-Type-Options': 'nosniff',
};
