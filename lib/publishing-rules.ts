import { z } from 'zod';
import { experienceLevels } from './job-options';

// Publish contract shared by Zod and the generated PostgreSQL safety net.
export const publishText = {
  title: [3, 120],
  company_name: [2, 120],
  location: [0, 100],
  state: [0, 100],
  country: [2, 100],
  qualification: [2, 120],
  category: [2, 80],
  salary_text: [1, 120],
  summary: [50, 20000],
  eligibility: [0, 5000],
  documents_needed: [0, 5000],
  how_to_apply: [0, 5000],
} as const;
export const workModes = ['office', 'hybrid', 'remote'] as const;
export const jobTypes = ['full-time', 'part-time', 'internship', 'contract'] as const;
export const blockedApplyHosts = [
  'wa.me',
  't.me',
  'telegram.me',
  'whatsapp.com',
  'bit.ly',
  'tinyurl.com',
  't.co',
  'goo.gl',
  'ow.ly',
  'rb.gy',
  'shorturl.at',
  'cutt.ly',
  'is.gd',
  'tiny.cc',
  'rebrand.ly',
  'buff.ly',
  'm.me',
  'signal.me',
] as const;
export const applyHostPattern =
  '(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?';
const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;
export function publishingMigration() {
  const textChecks = Object.entries(publishText).map(
    ([field, [min, max]]) => `public.publish_text_length(j.${field}) between ${min} and ${max}`,
  );
  const enums = Object.entries({
    work_mode: workModes,
    job_type: jobTypes,
    experience_level: experienceLevels,
  }).map(([field, values]) => `j.${field} in (${values.map(quote).join(',')})`);
  return `-- Generated from lib/publishing-rules.ts; regenerate with scripts/generate-publishing-migration.ts.
-- Never edit an applied migration: add a new migration when changing this contract.
begin;
create function public.publish_text_length(value text) returns integer
language sql immutable strict set search_path=pg_catalog,pg_temp as $$
  select coalesce(sum(case when ascii(ch) > 65535 then 2 else 1 end),0)::integer
  from regexp_split_to_table(btrim(value, ${[9, 10, 11, 12, 13, 32, 160, 5760, 8192, 8193, 8194, 8195, 8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288, 65279].map((code) => `chr(${code})`).join('||')}), '') ch where ch <> ''
$$;
create function public.job_publishable(j public.jobs) returns boolean
language sql immutable set search_path=pg_catalog,pg_temp as $$
select coalesce(
  ${[...textChecks, ...enums].join('\n  and ')}
  and (j.vacancies is null or j.vacancies between 1 and 1000000)
  and (
    (j.apply_url is not null and j.application_email is null
      and public.publish_text_length(j.apply_url) <= 2000
      and j.apply_url ~* ${quote(`^https://${applyHostPattern}([/?#][^[:space:]\\\\]*)?$`)}
      and j.apply_url !~ '[[:cntrl:]]'
      and length(rtrim(split_part(split_part(split_part(substring(lower(j.apply_url) from 9), '/', 1), '?', 1), '#', 1), '.')) <= 253
      and rtrim(split_part(split_part(split_part(substring(lower(j.apply_url) from 9), '/', 1), '?', 1), '#', 1), '.') !~ '(^[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+$|\\.local$)'
      and rtrim(split_part(split_part(split_part(substring(lower(j.apply_url) from 9), '/', 1), '?', 1), '#', 1), '.') !~ ${quote(`(^|\\.)(${blockedApplyHosts.map((h) => h.replaceAll('.', '\\.')).join('|')})$`)})
    or (j.apply_url is null and j.application_email is not null
      and length(j.application_email) <= 254
      and length(split_part(j.application_email, '@', 1)) <= 64
      and j.application_email !~ '(^\\.|\\.\\.|\\.@)'
      and j.application_email ~ ${quote(z.regexes.email.source)})
  ), false)
$$;
-- NOT VALID protects new writes without rejecting legacy rows during installation.
alter table public.jobs add constraint jobs_published_required_check
  check (status <> 'published' or public.job_publishable(jobs)) not valid;
-- Demote invalid legacy rows rather than destroying them. Owner must review before republishing.
update public.jobs set status='unpublished' where status='published' and not public.job_publishable(jobs);
alter table public.jobs validate constraint jobs_published_required_check;
notify pgrst, 'reload schema';
commit;
`;
}
