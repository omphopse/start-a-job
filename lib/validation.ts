import { publishText, workModes, jobTypes } from './publishing-rules';
import { experienceLevels } from './job-options';
import { z } from 'zod';
import { applicationInput, applicationUrl, applicationEmail } from './application-method';
const text = (min = 1, max = 200) => z.string().trim().min(min).max(max);
const jobFields = {
  title: text(...publishText.title),
  company_name: text(...publishText.company_name),
  location: text(...publishText.location).default(''),
  state: text(...publishText.state).default(''),
  country: text(...publishText.country).default('India'),
  work_mode: z.enum(workModes),
  qualification: text(...publishText.qualification),
  experience_level: z.enum(experienceLevels),
  category: text(...publishText.category),
  job_type: z.enum(jobTypes),
  salary_text: text(...publishText.salary_text),
  vacancies: z.preprocess(
    (v) => (v === '' || v == null ? null : Number(v)),
    z.number().int().min(1).max(1000000).nullable(),
  ),
  last_date: z.iso
    .date()
    .or(z.literal(''))
    .transform((v) => v || null),
  summary: text(...publishText.summary),
  eligibility: text(...publishText.eligibility).default(''),
  documents_needed: text(...publishText.documents_needed).default(''),
  how_to_apply: text(...publishText.how_to_apply).default(''),
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
  .object({
    ...jobFields,
    original_summary: z.literal('on', {
      error: 'Confirm that you wrote the summary in your own words.',
    }),
    application: applicationInput,
  })
  .transform(({ application, original_summary, ...fields }) => {
    void original_summary;
    return { ...fields, ...application };
  });
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
  work_mode: z.enum(workModes).optional().catch(undefined),
  sort: z.enum(['newest', 'last_date']).optional().catch(undefined),
  page: z
    .string()
    .regex(/^(?:[1-9]\d{0,3}|10000)$/)
    .optional()
    .catch(undefined),
});
export const parseFilters = (input: unknown) => filtersSchema.parse(input);
