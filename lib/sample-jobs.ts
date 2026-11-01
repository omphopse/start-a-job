import type { Job } from './jobs';
import { site } from './config';
const roles = [
  [
    'Customer Support Associate',
    'Northstar Services',
    'Bengaluru',
    'Karnataka',
    'Customer support',
  ],
  ['Junior Accounts Assistant', 'Bright Ledger', 'Pune', 'Maharashtra', 'Accounts'],
  ['Data Entry Executive', 'ClearDesk Solutions', 'Hyderabad', 'Telangana', 'Data entry'],
  ['HR Operations Intern', 'People First', 'Mumbai', 'Maharashtra', 'HR'],
  [
    'Office Administration Trainee',
    'Maple Business Services',
    'Chennai',
    'Tamil Nadu',
    'Administration',
  ],
  [
    'Customer Experience Executive',
    'Horizon Support',
    'Noida',
    'Uttar Pradesh',
    'Customer support',
  ],
  ['Junior Back Office Executive', 'Cedar Operations', 'Delhi', 'Delhi', 'Administration'],
  ['Accounts Trainee', 'Balance Works', 'Ahmedabad', 'Gujarat', 'Accounts'],
  ['Recruitment Coordinator', 'Talent Grove', 'Kolkata', 'West Bengal', 'HR'],
  ['Public Office Assistant', 'Sample Public Office', 'Jaipur', 'Rajasthan', 'Government'],
];
export const sampleJobs: Job[] = roles.map(([title, company, location, state, category], i) => ({
  id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
  slug: `${title}-${company}-${location}-s${i + 1}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  title,
  company_name: `${company} (Sample)`,
  location,
  state,
  work_mode: i === 5 ? 'remote' : i === 3 ? 'hybrid' : 'office',
  qualification: i === 2 ? '12th pass' : 'Any graduate',
  experience_level: i === 6 ? '0-1' : 'fresher',
  category,
  job_type: i === 3 ? 'internship' : 'full-time',
  salary_text: i === 2 ? '₹15,000–₹20,000 / month' : 'Not disclosed',
  vacancies: i === 9 ? null : i + 2,
  last_date: i === 9 ? null : '2099-12-31',
  apply_url: `https://example.com/careers/sample-${i + 1}`,
  application_email: null,
  summary: `SAMPLE DATA — This is a fictional vacancy for demonstrating ${site.name}. The ${title.toLowerCase()} role involves supporting day-to-day office operations, maintaining accurate records and collaborating with the team. No real recruitment is taking place.`,
  eligibility:
    i === 9
      ? ''
      : 'Fresh graduates with clear communication, basic computer skills and a willingness to learn. Check the official notice for exact eligibility.',
  documents_needed:
    i === 9
      ? ''
      : 'An updated résumé, education certificates and a valid identity document. Share sensitive documents only on a verified official portal.',
  how_to_apply:
    i === 9
      ? ''
      : 'Read the complete notice, check your eligibility and follow the application instructions on the official website. Never pay an application agent.',
  status: 'published',
  rejection_reason: null,
  created_by: '00000000-0000-4000-8000-999999999999',
  approved_by: null,
  published_at: new Date(Date.now() - i * 86400000).toISOString(),
  created_at: new Date(Date.now() - i * 86400000).toISOString(),
  updated_at: new Date().toISOString(),
}));
export const expiredSample: Job = {
  ...sampleJobs[0],
  id: '00000000-0000-4000-8000-000000000099',
  slug: 'expired-sample-job',
  title: 'Expired sample vacancy',
  last_date: '2020-01-01',
};
export const emailSample: Job = {
  ...sampleJobs[0],
  id: '00000000-0000-4000-8000-000000000100',
  slug: 'email-application-sample-job',
  apply_url: null,
  application_email: 'Recruitment+jobs@example.com',
};
