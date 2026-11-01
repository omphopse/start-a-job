begin;
-- Public pages use the anonymous client and its column-restricted projection.
-- Authenticated SQL reads must use owner/admin policies so another poster's
-- public row cannot expose internal fields through authenticated table grants.
alter policy jobs_public on public.jobs to anon;
commit;
