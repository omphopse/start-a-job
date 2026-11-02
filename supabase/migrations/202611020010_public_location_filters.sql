begin;
create function public.normalize_job_location(p_value text)
returns text language sql immutable parallel safe set search_path=pg_catalog, pg_temp as $$
  select case lower(btrim(regexp_replace(normalize(coalesce(p_value,''), NFC), '\s+', ' ', 'g')))
    when 'india' then 'India'
    when 'bharat' then 'India'
    when 'united states' then 'United States'
    when 'usa' then 'United States'
    when 'united kingdom' then 'United Kingdom'
    when 'uk' then 'United Kingdom'
    when 'canada' then 'Canada'
    when 'bangalore' then 'Bengaluru'
    when 'bengaluru' then 'Bengaluru'
    when 'bombay' then 'Mumbai'
    when 'mumbai' then 'Mumbai'
    when 'calcutta' then 'Kolkata'
    when 'kolkata' then 'Kolkata'
    when 'madras' then 'Chennai'
    when 'chennai' then 'Chennai'
    when 'orissa' then 'Odisha'
    when 'odisha' then 'Odisha'
    when 'pondicherry' then 'Puducherry'
    when 'puducherry' then 'Puducherry'
    when 'karnataka' then 'Karnataka'
    when 'maharashtra' then 'Maharashtra'
    when 'telangana' then 'Telangana'
    when 'tamil nadu' then 'Tamil Nadu'
    when 'uttar pradesh' then 'Uttar Pradesh'
    when 'delhi' then 'Delhi'
    when 'gujarat' then 'Gujarat'
    when 'west bengal' then 'West Bengal'
    when 'rajasthan' then 'Rajasthan'
    when 'pune' then 'Pune'
    when 'hyderabad' then 'Hyderabad'
    when 'noida' then 'Noida'
    when 'ahmedabad' then 'Ahmedabad'
    when 'jaipur' then 'Jaipur'
    else btrim(regexp_replace(normalize(coalesce(p_value,''), NFC), '\s+', ' ', 'g')) end
$$;
revoke all on function public.normalize_job_location(text) from public;
-- No table privileges are added. This pure helper is used inside the definer RPCs.
drop function public.search_public_jobs(text);
create function public.search_public_jobs(p_query text default null,p_country text default null,p_state text default null,p_city text default null)
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
    and (p_country is null or (length(p_country) between 1 and 100 and p_country ~ '^[[:alnum:] .,''’()&-]+$' and lower(public.normalize_job_location(j.country))=lower(public.normalize_job_location(p_country))))
    and (p_state is null or (length(p_state) between 1 and 100 and p_state ~ '^[[:alnum:] .,''’()&-]+$' and lower(public.normalize_job_location(j.state))=lower(public.normalize_job_location(p_state))))
    and (p_city is null or (length(p_city) between 1 and 100 and p_city ~ '^[[:alnum:] .,''’()&-]+$' and lower(public.normalize_job_location(j.location))=lower(public.normalize_job_location(p_city))))
$$;
revoke all on function public.search_public_jobs(text,text,text,text) from public;
grant execute on function public.search_public_jobs(text,text,text,text) to anon;
grant execute on function public.search_public_jobs(text,text,text,text) to authenticated;
create function public.public_job_location_facets(p_limit integer default 500)
returns table(country text,state text,city text,job_count bigint)
language sql stable security definer set search_path=pg_catalog, pg_temp as $$
  select public.normalize_job_location(j.country), public.normalize_job_location(j.state),
    public.normalize_job_location(j.location), count(*)
  from public.jobs j
  where j.status='published'
    and (j.last_date is null or j.last_date >= (now() at time zone 'Asia/Kolkata')::date)
  group by 1,2,3
  order by 1,2,3
  limit greatest(1,least(coalesce(p_limit,500),500))
$$;
revoke all on function public.public_job_location_facets(integer) from public;
grant execute on function public.public_job_location_facets(integer) to anon,authenticated;
notify pgrst, 'reload schema';
commit;
