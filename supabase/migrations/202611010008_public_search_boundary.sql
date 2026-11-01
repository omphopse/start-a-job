begin;
-- Remove table-wide SELECT too, so manually broadened anon grants cannot bypass revokes.
revoke select on public.jobs from anon;
revoke select (search_document,created_at,updated_at,status) on public.jobs from anon;
grant select (id,slug,title,company_name,location,state,country,work_mode,qualification,experience_level,category,job_type,salary_text,vacancies,last_date,apply_url,application_email,summary,eligibility,documents_needed,how_to_apply,published_at) on public.jobs to anon;
-- Return contracts are narrower than the previous RPCs. Atomic and repeatable.
drop function if exists public.search_public_jobs(text);
drop function if exists public.get_public_job(text);
drop function if exists public.get_expired_job(text);
create function public.search_public_jobs(p_query text default null)
returns table (
  id uuid,slug text,title text,company_name text,location text,state text,country text,
  work_mode text,qualification text,experience_level text,category text,job_type text,
  salary_text text,vacancies integer,last_date date,apply_url text,application_email text,
  summary text,eligibility text,documents_needed text,how_to_apply text,
  published_at timestamptz
) language sql stable security definer set search_path=pg_catalog, pg_temp as $$
  select j.id,j.slug,j.title,j.company_name,j.location,j.state,j.country,j.work_mode,
    j.qualification,j.experience_level,j.category,j.job_type,j.salary_text,j.vacancies,
    j.last_date,j.apply_url,j.application_email,j.summary,j.eligibility,j.documents_needed,
    j.how_to_apply,j.published_at
  from public.jobs j
  where j.status='published'
    and (j.last_date is null or j.last_date >= (now() at time zone 'Asia/Kolkata')::date)
    and (p_query is null or (length(p_query) between 1 and 120
      and j.search_document @@ pg_catalog.websearch_to_tsquery('english'::pg_catalog.regconfig, p_query)))
$$;
revoke all on function public.search_public_jobs(text) from public;
grant execute on function public.search_public_jobs(text) to anon;
create function public.get_public_job(p_slug text)
returns table (
  id uuid,slug text,title text,company_name text,location text,state text,country text,
  work_mode text,qualification text,experience_level text,category text,job_type text,
  salary_text text,vacancies integer,last_date date,apply_url text,application_email text,
  summary text,eligibility text,documents_needed text,how_to_apply text,
  published_at timestamptz
) language sql stable security definer set search_path=pg_catalog, pg_temp as $$
  select j.id,j.slug,j.title,j.company_name,j.location,j.state,j.country,j.work_mode,
    j.qualification,j.experience_level,j.category,j.job_type,j.salary_text,j.vacancies,
    j.last_date,j.apply_url,j.application_email,j.summary,j.eligibility,j.documents_needed,
    j.how_to_apply,j.published_at
  from public.jobs j
  where j.slug=p_slug and j.status='published'
    and (j.last_date is null or j.last_date >= (now() at time zone 'Asia/Kolkata')::date)
$$;
revoke all on function public.get_public_job(text) from public;
grant execute on function public.get_public_job(text) to anon;
create function public.get_expired_job(p_slug text)
returns table (
  id uuid,slug text,title text,company_name text,location text,state text,country text,
  work_mode text,qualification text,experience_level text,category text,job_type text,
  salary_text text,vacancies integer,last_date date,apply_url text,application_email text,
  summary text,eligibility text,documents_needed text,how_to_apply text,
  published_at timestamptz
) language sql stable security definer set search_path=pg_catalog, pg_temp as $$
  select j.id,j.slug,j.title,j.company_name,j.location,j.state,j.country,j.work_mode,
    j.qualification,j.experience_level,j.category,j.job_type,j.salary_text,j.vacancies,
    j.last_date,j.apply_url,j.application_email,j.summary,j.eligibility,j.documents_needed,
    j.how_to_apply,j.published_at
  from public.jobs j
  where j.slug=p_slug and j.status='published'
    and j.last_date < (now() at time zone 'Asia/Kolkata')::date
$$;
revoke all on function public.get_expired_job(text) from public;
grant execute on function public.get_expired_job(text) to anon;
grant execute on function public.get_expired_job(text) to authenticated;
notify pgrst, 'reload schema';
commit;
