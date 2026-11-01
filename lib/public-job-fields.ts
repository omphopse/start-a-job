import type { Job } from './jobs';

// Explicit projections keep creator IDs, moderation notes and search vectors
// out of shared public caches and serialized page props.
export type PublicJob = Omit<Job, 'created_by' | 'approved_by' | 'rejection_reason'>;
export type JobCardData = Pick<
  Job,
  | 'id'
  | 'slug'
  | 'title'
  | 'company_name'
  | 'location'
  | 'country'
  | 'job_type'
  | 'work_mode'
  | 'experience_level'
  | 'qualification'
  | 'salary_text'
  | 'published_at'
>;
export const PUBLIC_JOB_COLUMN_NAMES = [
  'id',
  'slug',
  'title',
  'company_name',
  'location',
  'state',
  'country',
  'work_mode',
  'qualification',
  'experience_level',
  'category',
  'job_type',
  'salary_text',
  'vacancies',
  'last_date',
  'apply_url',
  'application_email',
  'summary',
  'eligibility',
  'documents_needed',
  'how_to_apply',
  'status',
  'published_at',
  'created_at',
  'updated_at',
] as const;
export const PUBLIC_JOB_COLUMNS = PUBLIC_JOB_COLUMN_NAMES.join(',');
export const publicJobColumns = PUBLIC_JOB_COLUMNS;
export const jobCardColumns =
  'id,slug,title,company_name,location,country,job_type,work_mode,experience_level,qualification,salary_text,published_at';
export const publicJobsTag = 'public-jobs';
