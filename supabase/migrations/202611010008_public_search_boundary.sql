begin;
-- Direct access is unnecessary once callers use the bounded public RPC.
revoke select (search_document) on public.jobs from anon;
create function public.search_public_jobs(p_query text)
returns table (
  id uuid,slug text,title text,company_name text,location text,state text,country text,
  work_mode text,qualification text,experience_level text,category text,job_type text,
  salary_text text,vacancies integer,last_date date,apply_url text,application_email text,
  summary text,eligibility text,documents_needed text,how_to_apply text,status text,
  published_at timestamptz,created_at timestamptz,updated_at timestamptz
) language sql stable security definer set search_path=pg_catalog, pg_temp as $$
  select j.id,j.slug,j.title,j.company_name,j.location,j.state,j.country,j.work_mode,
    j.qualification,j.experience_level,j.category,j.job_type,j.salary_text,j.vacancies,
    j.last_date,j.apply_url,j.application_email,j.summary,j.eligibility,j.documents_needed,
    j.how_to_apply,j.status,j.published_at,j.created_at,j.updated_at
  from public.jobs j
  where j.status='published'
    and (j.last_date is null or j.last_date >= (now() at time zone 'Asia/Kolkata')::date)
    and length(p_query) between 1 and 120
    and j.search_document @@ pg_catalog.websearch_to_tsquery('english'::pg_catalog.regconfig, p_query)
$$;
revoke all on function public.search_public_jobs(text) from public;
grant execute on function public.search_public_jobs(text) to anon;
notify pgrst, 'reload schema';
commit;
