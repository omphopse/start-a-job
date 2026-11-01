-- Apply before deploying code selecting the country column.
begin;
alter table public.jobs add column country text not null default 'India';
alter table public.jobs add constraint jobs_country_check check (length(btrim(country)) between 2 and 100);
-- Empty strings represent an unspecified city or state; existing values are preserved.
alter table public.jobs alter column location set default '';
alter table public.jobs alter column state set default '';
commit;
