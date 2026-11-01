import { experienceLevels } from './job-options';
import { z } from 'zod';
import { applicationInput, applicationUrl, applicationEmail } from './application-method';
const text = (min = 1, max = 200) => z.string().trim().min(min).max(max);
const jobFields = {
  title: text(3, 120),
  company_name: text(2, 120),
  location: text(0, 100).default(''),
  state: text(0, 100).default(''),
  country: text(2, 100).default('India'),
  work_mode: z.enum(['office', 'hybrid', 'remote']),
  qualification: text(2, 120),
  experience_level: z.enum(experienceLevels),
  category: text(2, 80),
  job_type: z.enum(['full-time', 'part-time', 'internship', 'contract']),
  salary_text: text(1, 120),
  vacancies: z.preprocess(
    (v) => (v === '' || v == null ? null : Number(v)),
    z.number().int().min(1).max(1000000).nullable(),
  ),
  last_date: z.iso
    .date()
    .or(z.literal(''))
    .transform((v) => v || null),
  summary: text(50, 20000),
  eligibility: z.string().trim().max(5000).default(''),
  documents_needed: z.string().trim().max(5000).default(''),
  how_to_apply: z.string().trim().max(5000).default(''),
  official_confirmed: z.literal('on'),
  no_fees: z.literal('on'),
};
const blankToNull = (value: unknown) =>
  value == null || (typeof value === 'string' && !value.trim()) ? null : value;
// Persisted records (including admin approval) must have exactly one method.
export const jobInput = z
  .object({
    ...jobFields,
    apply_url: z.preprocess(blankToNull, applicationUrl.nullable()),
    application_email: z.preprocess(blankToNull, applicationEmail.nullable()),
  })
  .superRefine((job, ctx) => {
    if (Boolean(job.apply_url) === Boolean(job.application_email))
      ctx.addIssue({
        code: 'custom',
        path: ['application'],
        message: 'Provide exactly one application URL or email address.',
      });
  });
// A single form input produces both columns, explicitly clearing the old method.
export const jobFormInput = z
  .object({ ...jobFields, application: applicationInput })
  .transform(({ application, ...fields }) => ({ ...fields, ...application }));
export const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
export function makeSlug(title: string, company: string, city: string, id: string) {
  return `${slugify(`${title} ${company} ${city}`).slice(0, 170)}-${id.slice(0, 8)}`;
}
const queryText = (max = 100) => z.string().trim().max(max).optional().catch(undefined);
export const filtersSchema = z.object({
  q: queryText(120),
  state: queryText(100),
  location: queryText(100),
  qualification: queryText(120),
  experience_level: z.enum(experienceLevels).optional().catch(undefined),
  category: queryText(80),
  job_type: z
    .enum(['full-time', 'part-time', 'internship', 'contract'])
    .optional()
    .catch(undefined),
  work_mode: z.enum(['office', 'hybrid', 'remote']).optional().catch(undefined),
  sort: z.enum(['newest', 'last_date']).optional().catch(undefined),
  page: z
    .string()
    .regex(/^(?:[1-9]\d{0,3}|10000)$/)
    .optional()
    .catch(undefined),
});
export const parseFilters = (input: unknown) => filtersSchema.parse(input);
