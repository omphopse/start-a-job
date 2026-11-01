-- Apply after earlier migrations, before deploying code selecting application_email.
-- Existing URLs and rows are preserved. The previous URL format check remains.
begin;
alter table public.jobs add column application_email text;
alter table public.jobs alter column apply_url drop not null;
alter table public.jobs add constraint jobs_one_application_method_check check (
  (apply_url is not null and application_email is null) or
  (apply_url is null and application_email is not null)
);
alter table public.jobs add constraint jobs_application_email_check check (
  application_email is null or (
    application_email = btrim(application_email) and
    length(application_email) <= 254 and
    length(split_part(application_email, '@', 1)) <= 64 and
    application_email !~ '(^\.|\.\.|\.@)' and
    application_email ~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+$'
  )
);
-- Existing table grants, RLS, guard_job_write and get_expired_job's SETOF jobs
-- composite return continue to apply; no policy or privileges are broadened.
commit;
