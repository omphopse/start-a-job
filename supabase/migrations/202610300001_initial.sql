-- Run in a fresh Supabase project. All dates use India's calendar date.
create extension if not exists pgcrypto;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 email text not null, full_name text not null default '',
 role text not null check(role in ('admin','poster')), is_active boolean not null default true
);
create function public.is_admin() returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from profiles where id=auth.uid() and role='admin' and is_active) $$;
create function public.is_poster() returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from profiles where id=auth.uid() and role='poster' and is_active) $$;
create table public.jobs (
 id uuid primary key default gen_random_uuid(), slug text unique not null,
 title text not null, company_name text not null, location text not null, state text not null,
 work_mode text not null check(work_mode in ('office','hybrid','remote')),
 qualification text not null, experience_level text not null check(experience_level in ('fresher','0-1','1-3')),
 category text not null, job_type text not null check(job_type in ('full-time','part-time','internship','contract')),
 salary_text text not null default 'Not disclosed', vacancies integer check(vacancies>0), last_date date,
 apply_url text not null check(apply_url ~ '^https://[^/[:space:]]+'),
 summary text not null, eligibility text not null, documents_needed text not null, how_to_apply text not null,
 status text not null default 'draft' check(status in ('draft','pending','published','rejected','unpublished')),
 rejection_reason text, created_by uuid not null references profiles(id), approved_by uuid references profiles(id),
 published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 search_document tsvector generated always as (to_tsvector('english',title||' '||company_name||' '||location||' '||category)) stored
);
create index jobs_status_idx on jobs(status);
create index jobs_last_date_idx on jobs(last_date);
create index jobs_published_at_idx on jobs(published_at desc);
create index jobs_state_idx on jobs(state);
create index jobs_category_idx on jobs(category);
create index jobs_search_idx on jobs using gin(search_document);
create index jobs_creator_idx on jobs(created_by);
create function public.guard_job_write() returns trigger language plpgsql set search_path=public as $$
begin
 if TG_OP='UPDATE' and old.published_at is not null and new.slug<>old.slug then raise exception 'Published slugs are permanent'; end if;
 if auth.role()<>'service_role' and not public.is_admin() then
  if not public.is_poster() or new.created_by<>auth.uid() then raise exception 'Active poster required'; end if;
  if new.status not in ('draft','pending','rejected') then raise exception 'Posters cannot publish or unpublish'; end if;
  if TG_OP='INSERT' and (new.status not in ('draft','pending') or new.approved_by is not null or new.published_at is not null or new.rejection_reason is not null) then raise exception 'Invalid submission'; end if;
  if TG_OP='UPDATE' then
   if old.status not in ('draft','pending','rejected') or new.created_by<>old.created_by or new.approved_by is distinct from old.approved_by or new.published_at is distinct from old.published_at or new.rejection_reason is distinct from old.rejection_reason then raise exception 'Protected review fields'; end if;
  end if;
 end if;
 if new.status='published' and new.published_at is null then new.published_at=now(); end if;
 new.updated_at=now(); return new;
end $$;
create trigger guard_job_write before insert or update on jobs for each row execute function guard_job_write();
create table public.apply_clicks(job_id uuid not null references jobs(id) on delete cascade, created_at timestamptz not null default now());
create table public.job_reports(id uuid primary key default gen_random_uuid(),job_id uuid not null references jobs(id) on delete cascade,reason text not null check(length(reason) between 5 and 1000),created_at timestamptz not null default now());
create table public.landing_pages(path text primary key,intro text not null check(length(intro) between 20 and 2000),updated_at timestamptz not null default now());
create table public.deleted_jobs(slug text primary key,deleted_at timestamptz not null default now());
create function public.remember_deleted_job() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into deleted_jobs(slug) values(old.slug) on conflict do nothing; return old; end $$;
create trigger remember_deleted_job after delete on jobs for each row execute function remember_deleted_job();
alter table profiles enable row level security;
alter table jobs enable row level security;
alter table apply_clicks enable row level security;
alter table job_reports enable row level security;
alter table landing_pages enable row level security;
alter table deleted_jobs enable row level security;
-- A profile is private to its owner and active admins. Only admins may modify roles.
create policy profiles_read on profiles for select using(id=auth.uid() or is_admin());
create policy profiles_admin on profiles for all using(is_admin()) with check(is_admin());
-- Anonymous readers see current published vacancies only.
create policy jobs_public on jobs for select using(status='published' and (last_date is null or last_date >= (now() at time zone 'Asia/Kolkata')::date));
-- Active posters see their own jobs and may edit only pre-publication submissions.
create policy jobs_poster_read on jobs for select using(is_poster() and created_by=auth.uid());
create policy jobs_poster_insert on jobs for insert with check(is_poster() and created_by=auth.uid() and status in ('draft','pending'));
create policy jobs_poster_update on jobs for update using(is_poster() and created_by=auth.uid() and status in ('draft','pending','rejected')) with check(is_poster() and created_by=auth.uid() and status in ('draft','pending','rejected'));
-- Admins manage every job. The trigger separately enforces immutable published slugs.
create policy jobs_admin on jobs for all using(is_admin()) with check(is_admin());
-- Clicks and reports have no public read/write access; bounded RPCs below accept writes.
create policy clicks_admin on apply_clicks for all using(is_admin()) with check(is_admin());
create policy reports_admin on job_reports for all using(is_admin()) with check(is_admin());
create policy landing_public on landing_pages for select using(true);
create policy landing_admin on landing_pages for all using(is_admin()) with check(is_admin());
create policy tombstones_public on deleted_jobs for select using(true);
create policy tombstones_admin on deleted_jobs for all using(is_admin()) with check(is_admin());
create function public.log_apply_click(p_job_id uuid) returns void language plpgsql security definer set search_path=public as $$ begin
 insert into apply_clicks(job_id) select id from jobs where id=p_job_id and status='published' and (last_date is null or last_date >= (now() at time zone 'Asia/Kolkata')::date);
end $$;
-- Expired published rows are exposed only through this narrowly scoped detail RPC.
create function public.get_expired_job(p_slug text) returns setof jobs language sql stable security definer set search_path=public as $$ select * from jobs where slug=p_slug and status='published' and last_date < (now() at time zone 'Asia/Kolkata')::date $$;
revoke all on function public.log_apply_click(uuid) from public;
grant execute on function public.log_apply_click(uuid) to anon, authenticated;
revoke all on function public.get_expired_job(text) from public;
grant execute on function public.get_expired_job(text) to anon, authenticated;
-- Durable, atomic rate limiting. Only server-side service_role may call this.
create table public.request_limits(key text primary key,hits integer not null,reset_at timestamptz not null);
alter table request_limits enable row level security;
create function public.take_rate_limit(p_key text,p_limit integer,p_seconds integer) returns boolean language plpgsql security definer set search_path=public as $$ declare n integer; begin
 insert into request_limits values(p_key,1,now()+make_interval(secs=>p_seconds)) on conflict(key) do update set hits=case when request_limits.reset_at<now() then 1 else request_limits.hits+1 end, reset_at=case when request_limits.reset_at<now() then now()+make_interval(secs=>p_seconds) else request_limits.reset_at end returning hits into n;
 return n<=p_limit;
end $$;
revoke all on function public.take_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.take_rate_limit(text,integer,integer) to service_role;
grant select on profiles,jobs,landing_pages,deleted_jobs to anon,authenticated;
grant insert,update,delete on profiles,jobs,landing_pages,deleted_jobs to authenticated;
grant select,insert,update,delete on apply_clicks,job_reports to authenticated;
grant all on all tables in schema public to service_role;
