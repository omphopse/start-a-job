# v0.1.2 public-column audit and operator runbook

No production SQL, migration repair, deployment, or REST request was executed for this change. The supplied live report is evidence of grants, not migration history. The grant listing in the request was `[PASTE RESULT]`; neither it nor the contents of schema_migrations were supplied. All live history classifications below are UNKNOWN pending the read-only queries below.

## Column decisions (line numbers refer to this release)

| Column | App use | Anon SELECT required by this release? |
| --- | --- | --- |
| application_email | lib/public-job-fields.ts:38 projects it; lib/application-method.ts:100 resolves it; components/application-panel.tsx:30 passes it to EmailApplyPanel; components/email-apply-panel.tsx:39 displays the address and mailto; :60 builds the application mailto. lib/public-api.ts:34 publishes it in JSON. | Yes, public by design. Email applications must work. The address is scrapeable through REST, JSON and client props even during the countdown. components/job-form.tsx:96 warns all posters and admins to use a role address, never a personal email. |
| search_document | Before this change lib/data.ts:66 called textSearch with websearch/english. Now lib/data.ts:64 calls search_public_jobs; migration 008 filters the vector internally. | No direct SELECT needed after switching to the RPC. 008 revokes it. |
| status | lib/data.ts:68 filters published; lib/public-job-cache.ts:26 and :54 do the same. lib/public-job-fields.ts:43 selects it. lib/jobs.ts:39-40 checks status and deadline; app/jobs/[slug]/page.tsx invokes isCurrent for metadata/rendering. | Yes in the current direct-table design; it is queried and consumed, not just used by RLS. It only reveals published for public rows. |
| updated_at | lib/public-job-fields.ts:46 selects it; app/jobs/[slug]/page.tsx:176 displays Last updated; app/sitemaps/[file]/route.ts:16 uses it for job lastmod and :27 computes landing-page lastmod. | Yes. Public sorting uses published_at or last_date (lib/data.ts), not updated_at; admin sorting uses updated_at (app/admin/page.tsx:19). |

A public view or RPC should retain application_email and updated_at as safe public fields; email removal would require an application relay and revised API contract. A future API could hide status by enforcing published/current predicates inside a SECURITY DEFINER function and having the UI treat its result as published. It would need a separate expired-job contract. A view may expose only public columns with security_invoker=true, but then the caller still needs underlying grants; it alone does not solve vector permissions. 008 implements the search boundary now: explicit return columns, fixed pg_catalog/pg_temp search_path, fully qualified table and search parser, no dynamic SQL, input length bound, published/current predicate, and EXECUTE revoked from PUBLIC. No service key is introduced into public requests.

## Public query coverage

PUBLIC_JOB_COLUMN_NAMES and PUBLIC_JOB_COLUMNS in lib/public-job-fields.ts are the allow-list and projection. lib/data.ts uses it for table and search RPC reads; lib/public-job-cache.ts uses it for detail, expired RPC, and similar reads. scripts/profile-public-job.ts uses it too. The old publicJobColumns export remains a compatibility alias.

- Sitemap: app/sitemaps/[file]/route.ts -> lib/seo/sitemap.ts:7 -> listJobs.
- Public list API: app/api/public/jobs.json/route.ts:23 -> listJobs.
- Public detail API: app/api/public/jobs/[file]/route.ts -> getJob -> cachedPublicJob.
- Feed: app/feed.xml/route.ts:6 -> listJobs.
- Home: app/page.tsx:28 -> listJobs. Search: app/jobs/page.tsx:25 -> listJobs.
- Landing pages: lib/landing.ts:10 and :28 -> allCurrentJobs/listJobs.
- generateStaticParams: app/jobs/[slug]/page.tsx:17 returns []; it performs no database query. The info-page generator uses static content, not jobs.

Authenticated admin queries intentionally use complete rows for editing and moderation; these are not public queries.

## Read-only live reconciliation (operator runs these)

```sql
select version, name from supabase_migrations.schema_migrations order by version;
select a.attname as column_name,
       has_column_privilege('anon','public.jobs',a.attname,'SELECT') as anon_select
from pg_attribute a
where a.attrelid='public.jobs'::regclass and a.attnum>0 and not a.attisdropped
order by a.attnum;
-- Verify RLS, grants, policies and function bodies, not just column existence:
select relrowsecurity from pg_class where oid='public.jobs'::regclass;
select policyname, roles, cmd, qual, with_check from pg_policies
where schemaname='public' and tablename in ('jobs','deleted_jobs');
select column_name from information_schema.columns
where table_schema='public' and table_name='jobs' order by ordinal_position;
select conname, pg_get_constraintdef(oid) from pg_constraint
where conrelid='public.jobs'::regclass;
select p.oid::regprocedure, p.prosecdef, p.proconfig, p.proacl,
       pg_get_functiondef(p.oid)
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in
('get_expired_job','search_public_jobs','log_apply_click');
```

| Repo version | Purpose | Live recorded? | Full SQL applied manually? |
| --- | --- | --- | --- |
| 202610300001 | initial schema | UNKNOWN | UNKNOWN |
| 202610300002 | categories/experience | UNKNOWN | UNKNOWN |
| 202611010001 | application email | UNKNOWN | UNKNOWN |
| 202611010002 | **No such file in repo** | UNKNOWN | UNKNOWN |
| 202611010003 | country | UNKNOWN | UNKNOWN |
| 202611010004 | anon column grants/expired RPC | UNKNOWN | UNKNOWN; reported denied columns are consistent with its grants |
| 202611010005 | click RPC execution | UNKNOWN | UNKNOWN |
| 202611010006 | poster privacy | UNKNOWN | UNKNOWN |
| 202611010007 | tombstone privacy | UNKNOWN | UNKNOWN |
| 202611010008 | private search vector/public RPC | Not applied by this task | Not applied by this task |

Only mark a version applied when its **entire effect** is verified present and its history row is missing. Individual denied columns do not prove 004-007 were run. These are the exact per-version repair commands, conditional on that finding; do not run the whole block blindly:

```powershell
supabase migration list --linked
supabase migration repair 202610300001 --status applied --linked
supabase migration repair 202610300002 --status applied --linked
supabase migration repair 202611010001 --status applied --linked
supabase migration repair 202611010003 --status applied --linked
supabase migration repair 202611010004 --status applied --linked
supabase migration repair 202611010005 --status applied --linked
supabase migration repair 202611010006 --status applied --linked
supabase migration repair 202611010007 --status applied --linked
# ONLY if 008 was later applied manually and is missing from history:
supabase migration repair 202611010008 --status applied --linked
supabase migration list --linked
supabase db push --linked --dry-run
```

If a history row is present but its SQL was never run, the corresponding command is `supabase migration repair VERSION --status reverted --linked`; then apply the actual migration. If SQL is partially applied, reconcile the missing effects before marking applied; do not rerun non-idempotent migrations blindly. If live has a 202611010002 or any other version absent locally, recover its original SQL from the operator/source history before pushing. Do not erase an unknown remote version simply to silence a CLI error. A gap in numbering alone needs no repair. Repair changes history only, not schema.

Supabase reference: [Database migrations](https://supabase.com/docs/guides/deployment/database-migrations)
PostgreSQL SECURITY DEFINER reference: [CREATE FUNCTION](https://www.postgresql.org/docs/current/sql-createfunction.html)

## Operator deployment and rollback (instructions only)

1. Reconcile existing history as above. Test all migrations on a disposable database/staging first.
2. Apply 008 before deploying this application release. The transaction adds the RPC and revokes vector access together; the old application will lose keyword search during this interval. Coordinate a short maintenance window or deploy an intermediate RPC-compatible release before revoking access. Plain listing and detail reads retain their grants.
3. After reviewing `supabase db push --linked --dry-run`, the operator may run `supabase db push --linked`. This task has not run either command.
4. Deploy this code, then verify keyword search, filters, pagination/counts, email applications, expired pages and sitemap timestamps.
5. From PowerShell 7, with only the public URL and anon key set in process environment, run `pwsh -NoProfile -File scripts/verify-live-anon.ps1`. It prints column names/results only, never keys or bodies. Denial requires SQL permission error 42501; outages fail closed. An empty table still proves SELECT permission. The script must PASS after 008; before 008 it should report EXPOSED: search_document and FAIL.
6. Rollback SQL is supabase/rollbacks/202611010008_public_search_boundary.sql (outside the forward migration directory). Restore the vector grant first, deploy the preceding application, then drop the RPC; the file is atomic and intended for a coordinated maintenance window. After manually rolling back the schema, record `supabase migration repair 202611010008 --status reverted --linked` so a later push can reapply it. Repair alone does not roll back SQL.

The PGlite security regression enumerates **every actual jobs column as owner**, switches to anon, and rejects SELECT of every column outside the shared allow-list. It verifies allow-list reads, select-star denial, search result columns, draft and expired exclusion, and rollback followed by reapplication. It runs without live credentials. This catches newly added columns accidentally granted to anon as well as the four currently internal columns.
