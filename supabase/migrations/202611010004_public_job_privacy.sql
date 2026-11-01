begin;
-- Anonymous readers must request explicit public columns, never internal review data.
revoke select on public.jobs from anon;
grant select (
  id,slug,title,company_name,location,state,country,work_mode,qualification,
  experience_level,category,job_type,salary_text,vacancies,last_date,apply_url,
  application_email,summary,eligibility,documents_needed,how_to_apply,status,
  published_at,created_at,updated_at,search_document
) on public.jobs to anon;
-- search_document contains only public title/company/location/category text and
-- is needed for full-text filtering. Creator IDs and moderation notes stay private.
drop function public.get_expired_job(text);
create function public.get_expired_job(p_slug text)
returns table (
  id uuid,slug text,title text,company_name text,location text,state text,country text,
  work_mode text,qualification text,experience_level text,category text,job_type text,
  salary_text text,vacancies integer,last_date date,apply_url text,application_email text,
  summary text,eligibility text,documents_needed text,how_to_apply text,status text,
  published_at timestamptz,created_at timestamptz,updated_at timestamptz
) language sql stable security definer set search_path=public as $$
  select j.id,j.slug,j.title,j.company_name,j.location,j.state,j.country,j.work_mode,
    j.qualification,j.experience_level,j.category,j.job_type,j.salary_text,j.vacancies,
    j.last_date,j.apply_url,j.application_email,j.summary,j.eligibility,j.documents_needed,
    j.how_to_apply,j.status,j.published_at,j.created_at,j.updated_at
  from public.jobs j
  where j.slug=p_slug and j.status='published'
    and j.last_date < (now() at time zone 'Asia/Kolkata')::date
$$;
revoke all on function public.get_expired_job(text) from public;
grant execute on function public.get_expired_job(text) to anon,authenticated;
commit;
