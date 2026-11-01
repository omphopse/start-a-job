-- Roll the application back to direct textSearch before dropping this RPC.
begin;
grant select (search_document) on public.jobs to anon;
drop function public.search_public_jobs(text);
notify pgrst, 'reload schema';
commit;
