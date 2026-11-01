-- Generated from lib/publishing-rules.ts; regenerate with scripts/generate-publishing-migration.ts.
-- Never edit an applied migration: add a new migration when changing this contract.
begin;
create function public.job_publishable(j public.jobs) returns boolean
language sql immutable set search_path=pg_catalog,pg_temp as $$
select coalesce(
  length(btrim(j.title)) between 3 and 120
  and length(btrim(j.company_name)) between 2 and 120
  and length(btrim(j.location)) between 0 and 100
  and length(btrim(j.state)) between 0 and 100
  and length(btrim(j.country)) between 2 and 100
  and length(btrim(j.qualification)) between 2 and 120
  and length(btrim(j.category)) between 2 and 80
  and length(btrim(j.salary_text)) between 1 and 120
  and length(btrim(j.summary)) between 50 and 20000
  and length(btrim(j.eligibility)) between 0 and 5000
  and length(btrim(j.documents_needed)) between 0 and 5000
  and length(btrim(j.how_to_apply)) between 0 and 5000
  and j.work_mode in ('office','hybrid','remote')
  and j.job_type in ('full-time','part-time','internship','contract')
  and j.experience_level in ('fresher','0-1','1-3','3-5','5-6','6-9','10-14','15+')
  and (j.vacancies is null or j.vacancies between 1 and 1000000)
  and (
    (j.apply_url is not null and j.application_email is null
      and length(j.apply_url) <= 2000
      and j.apply_url ~* '^https://[^/@:[:space:]\\]+\.[^/@:[:space:]\\]+([/?#][^[:space:]\\]*)?$'
      and j.apply_url !~ '[[:cntrl:]]'
      and split_part(split_part(split_part(substring(lower(j.apply_url) from 9), '/', 1), '?', 1), '#', 1) !~ '(^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$|\.local$)'
      and split_part(split_part(split_part(substring(lower(j.apply_url) from 9), '/', 1), '?', 1), '#', 1) !~ '(^|\.)(wa\.me|t\.me|telegram\.me|whatsapp\.com|bit\.ly|tinyurl\.com)$')
    or (j.apply_url is null and j.application_email is not null
      and length(j.application_email) <= 254
      and length(split_part(j.application_email, '@', 1)) <= 64
      and j.application_email !~ '(^\.|\.\.|\.@)'
      and j.application_email ~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+$')
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
