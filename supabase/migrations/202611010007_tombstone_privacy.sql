begin;
-- Legacy tombstones do not say whether a job was ever public. Preserve them
-- for owner review, but hide unclassified records instead of exposing drafts.
alter table public.deleted_jobs add column was_public boolean not null default false;
alter policy tombstones_public on public.deleted_jobs using (was_public);
create or replace function public.remember_deleted_job()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if old.published_at is not null then
    insert into public.deleted_jobs(slug,was_public) values(old.slug,true)
      on conflict(slug) do update set was_public=true;
  end if;
  return old;
end
$$;
commit;
