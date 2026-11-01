import type { experienceLevels } from './job-options';
export type Job = {
  id: string;
  slug: string;
  title: string;
  company_name: string;
  location: string;
  state: string;
  country?: string;
  work_mode: 'office' | 'hybrid' | 'remote';
  qualification: string;
  experience_level: (typeof experienceLevels)[number];
  category: string;
  job_type: 'full-time' | 'part-time' | 'internship' | 'contract';
  salary_text: string;
  vacancies: number | null;
  last_date: string | null;
  apply_url: string | null;
  application_email: string | null;
  summary: string;
  eligibility: string;
  documents_needed: string;
  how_to_apply: string;
  status: 'draft' | 'pending' | 'published' | 'rejected' | 'unpublished';
  rejection_reason: string | null;
  created_by: string;
  approved_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};
export const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
export const isCurrent = (job: Pick<Job, 'status' | 'last_date'>) =>
  job.status === 'published' && (!job.last_date || job.last_date >= today());
