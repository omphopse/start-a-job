begin;
alter table public.jobs drop constraint if exists jobs_published_required_check;
drop function if exists public.job_publishable(public.jobs);
drop function if exists public.publish_text_length(text);
-- Deliberately do not republish demoted legacy records; review them manually.
notify pgrst, 'reload schema';
commit;
