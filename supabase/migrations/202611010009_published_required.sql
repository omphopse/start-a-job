-- Generated from lib/publishing-rules.ts; regenerate with scripts/generate-publishing-migration.ts.
-- Never edit an applied migration: add a new migration when changing this contract.
begin;
create function public.publish_text_length(value text) returns integer
language sql immutable strict set search_path=pg_catalog,pg_temp as $$
  select coalesce(sum(case when ascii(ch) > 65535 then 2 else 1 end),0)::integer
  from regexp_split_to_table(btrim(value, chr(9)||chr(10)||chr(11)||chr(12)||chr(13)||chr(32)||chr(160)||chr(5760)||chr(8192)||chr(8193)||chr(8194)||chr(8195)||chr(8196)||chr(8197)||chr(8198)||chr(8199)||chr(8200)||chr(8201)||chr(8202)||chr(8232)||chr(8233)||chr(8239)||chr(8287)||chr(12288)||chr(65279)), '') ch where ch <> ''
$$;
create function public.job_publishable(j public.jobs) returns boolean
language sql immutable set search_path=pg_catalog,pg_temp as $$
select coalesce(
  public.publish_text_length(j.title) between 3 and 120
  and public.publish_text_length(j.company_name) between 2 and 120
  and public.publish_text_length(j.location) between 0 and 100
  and public.publish_text_length(j.state) between 0 and 100
  and public.publish_text_length(j.country) between 2 and 100
  and public.publish_text_length(j.qualification) between 2 and 120
  and public.publish_text_length(j.category) between 2 and 80
  and public.publish_text_length(j.salary_text) between 1 and 120
  and public.publish_text_length(j.summary) between 50 and 20000
  and public.publish_text_length(j.eligibility) between 0 and 5000
  and public.publish_text_length(j.documents_needed) between 0 and 5000
  and public.publish_text_length(j.how_to_apply) between 0 and 5000
  and j.work_mode in ('office','hybrid','remote')
  and j.job_type in ('full-time','part-time','internship','contract')
  and j.experience_level in ('fresher','0-1','1-3','3-5','5-6','6-9','10-14','15+')
  and (j.vacancies is null or j.vacancies between 1 and 1000000)
  and (
    (j.apply_url is not null and j.application_email is null
      and public.publish_text_length(j.apply_url) <= 2000
      and j.apply_url ~* '^https://(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?([/?#][^[:space:]\\]*)?$'
      and j.apply_url !~ '[[:cntrl:]]'
      and length(rtrim(split_part(split_part(split_part(substring(lower(j.apply_url) from 9), '/', 1), '?', 1), '#', 1), '.')) <= 253
      and rtrim(split_part(split_part(split_part(substring(lower(j.apply_url) from 9), '/', 1), '?', 1), '#', 1), '.') !~ '(^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$|\.local$)'
      and rtrim(split_part(split_part(split_part(substring(lower(j.apply_url) from 9), '/', 1), '?', 1), '#', 1), '.') !~ '(^|\.)(wa\.me|t\.me|telegram\.me|whatsapp\.com|bit\.ly|tinyurl\.com|t\.co|goo\.gl|ow\.ly|rb\.gy|shorturl\.at|cutt\.ly|is\.gd|tiny\.cc|rebrand\.ly|buff\.ly|m\.me|signal\.me)$')
    or (j.apply_url is null and j.application_email is not null
      and length(j.application_email) <= 254
      and length(split_part(j.application_email, '@', 1)) <= 64
      and j.application_email !~ '(^\.|\.\.|\.@)'
      and j.application_email ~ '^(?:[A-Za-z0-9_''+\-]+\.)*[A-Za-z0-9_''+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$')
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
