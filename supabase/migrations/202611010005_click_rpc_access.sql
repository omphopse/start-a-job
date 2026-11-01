begin;
-- Click writes must pass through the application's UUID validation and durable
-- per-client limiter. Direct PostgREST calls cannot bypass that boundary.
revoke all on function public.log_apply_click(uuid) from public,anon,authenticated;
grant execute on function public.log_apply_click(uuid) to service_role;
commit;
