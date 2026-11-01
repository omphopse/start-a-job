# v0.1.2 public-column audit and operator runbook

No production or staging database request, SQL, repair or deployment was executed for this change. The operator supplied a staging live-query result with **26 granted columns**: the final 22-column public allow-list plus search_document, created_at, updated_at and status. application_email is intentionally in the public allow-list. created_by, approved_by and rejection_reason are absent. This matches migration 004's grant list; it does not establish that its full SQL or any migration history rows are present. Live migration history remains UNKNOWN pending the read-only queries below.

## Five-column decisions and exact use sites

"Before" references are verified against commit ff92add (the first audit), before this follow-up. "Now" references describe this release.

| Column            | Before: exact app use                                                                                                                                                                                                                                                                                                     | Final anon SELECT decision and replacement                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| application_email | lib/application-method.ts:100 resolves the address. components/application-panel.tsx:30 passes it to EmailApplyPanel; components/email-apply-panel.tsx:39 visibly prints the address with a mailto link after the countdown; :60 builds the mailto application link. lib/public-api.ts:34 also exposes it in public JSON. | **Keep: intentional public email applications.** The countdown is not a privacy boundary: JSON and client props expose it. components/job-form.tsx:96 warns posters/admins: "this email is visible to everyone; use a role address, never a personal email." Scrapers can harvest it. Making it private requires an application relay and a changed public API/product contract.                                    |
| created_at        | lib/public-job-fields.ts:45 selected it. lib/seo/schema.ts:23 used it as a fallback for JobPosting datePosted; app/feed.xml/route.ts:8 used it as a fallback for RSS pubDate. No public filter or sort used it.                                                                                                           | **Revoke.** Remove it from the shared projection and all three RPC return types. Schema and feed now use published_at only, omitting the date when absent instead of disclosing creation time.                                                                                                                                                                                                                      |
| search_document   | Before the initial fix, lib/data.ts:66 called textSearch with websearch/english; ff92add had moved keyword queries to search_public_jobs.                                                                                                                                                                                 | **Revoke.** search_public_jobs filters internally with a fixed pg_catalog/pg_temp search_path and an explicit safe return schema. The vector is never returned.                                                                                                                                                                                                                                                     |
| status            | lib/data.ts:68 and lib/public-job-cache.ts:26,:54 filtered status=published. lib/jobs.ts:39-40 checks status/deadline; app/jobs/[slug]/page.tsx:34,:44 uses it for metadata/current visibility, public detail API :18 and report action :25 also use isCurrent. It was selected, not merely used by RLS.                  | **Revoke after rewriting all public queries.** Listing/similar use search_public_jobs, detail uses get_public_job, expired detail uses get_expired_job. Each enforces published visibility inside the fixed-path function. None returns status. lib/public-job-fields.ts:10 derives status='published' for the existing visibility checks only after receiving a safe RPC row. No anon filter/order selects status. |
| updated_at        | lib/public-job-fields.ts:46 selected it; app/jobs/[slug]/page.tsx:176 displayed Last updated; app/sitemaps/[file]/route.ts:16 used it for job lastmod and :27 aggregated landing-page lastmod. No public sort/filter used it; admin/page.tsx:19 sorts by it with authenticated access.                                    | **Revoke.** Remove the detail Last updated line and use the already-public posted date. Sitemap uses published_at (:16 and :27-29), omitting dates when absent. This is a conservative publication timestamp; edits without republication no longer advance lastmod. None of the public RPCs returns updated_at.                                                                                                    |

## Public query and filter/order coverage

PUBLIC_JOB_COLUMN_NAMES/PUBLIC_JOB_COLUMNS in lib/public-job-fields.ts contain exactly 22 public database fields. publicJobRow copies only those fields and derives published status; it also sanitizes demo rows. Cache keys were advanced so old timestamp-bearing cached rows are not reused.

- lib/data.ts:70 calls search_public_jobs for both unfiltered listings and keyword search, with exact count and the shared projection. Remaining filters use public state/location/qualification/experience_level/job_type/category/work_mode fields. Sorting uses only published_at or last_date, both granted public fields.
- lib/public-job-cache.ts:23 reads get_public_job; :30 reads get_expired_job; :48 reads search_public_jobs for similar jobs. All use PUBLIC_JOB_COLUMNS. Similar filters use category/last_date and sort by published_at. No direct public jobs table query remains in application code.
- scripts/profile-public-job.ts:49,:66 use public RPCs/the shared projection; the tombstone query selects only slug from deleted_jobs, a separate table.
- Sitemap -> lib/seo/sitemap.ts:7 -> listJobs. Public list API -> app/api/public/jobs.json/route.ts:23 -> listJobs. Public detail API -> getJob -> cachedPublicJob. Feed -> app/feed.xml/route.ts:6 -> listJobs. Home -> app/page.tsx:28 -> listJobs. Search -> app/jobs/page.tsx:25 -> listJobs. Landing pages -> lib/landing.ts:10,:28 -> allCurrentJobs/listJobs.
- generateStaticParams in app/jobs/[slug]/page.tsx:17 returns []; it does not query a database. The info-page generator uses static content.
- Authenticated admin queries retain timestamps/status for editing and moderation. app/api/internal/expire uses the server role to filter status; it is not an anon endpoint. No public query filters or orders on created_at, updated_at or status after this change.

008 is idempotent: it removes broad table SELECT, revokes the four internal column grants, regrants only the shared public columns, and atomically drops/recreates the three explicit return contracts. Every function has a fixed trusted search_path, fully qualified public.jobs references, no dynamic SQL, and EXECUTE revoked from PUBLIC. Search accepts null for public listing or a bounded 1-120 character query. Each function independently enforces published/current or published/expired visibility; SECURITY DEFINER does not rely on caller RLS. It uses no service key in application requests.

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
('get_expired_job','get_public_job','search_public_jobs','log_apply_click');
```

| Repo version | Purpose                                       | Live recorded?           | Full SQL applied manually?                                        |
| ------------ | --------------------------------------------- | ------------------------ | ----------------------------------------------------------------- |
| 202610300001 | initial schema                                | UNKNOWN                  | UNKNOWN                                                           |
| 202610300002 | categories/experience                         | UNKNOWN                  | UNKNOWN                                                           |
| 202611010001 | application email                             | UNKNOWN                  | UNKNOWN                                                           |
| 202611010002 | **No such file in repo**                      | UNKNOWN                  | UNKNOWN                                                           |
| 202611010003 | country                                       | UNKNOWN                  | UNKNOWN                                                           |
| 202611010004 | anon column grants/expired RPC                | UNKNOWN                  | UNKNOWN; supplied 26-column grant list exactly matches its grants |
| 202611010005 | click RPC execution                           | UNKNOWN                  | UNKNOWN                                                           |
| 202611010006 | poster privacy                                | UNKNOWN                  | UNKNOWN                                                           |
| 202611010007 | tombstone privacy                             | UNKNOWN                  | UNKNOWN                                                           |
| 202611010008 | private vector/timestamps/status; public RPCs | Not applied by this task | Not applied by this task                                          |

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
2. Apply 008 before deploying this application release. The transaction installs the three safe RPC contracts and revokes all four internal fields together; the old application selects revoked columns and will lose public reads during this interval. Coordinate a short maintenance window or use a separately planned expand/contract rollout that installs the new RPC contracts before switching reads and revoking grants. Do not deploy either half of this one-step release in isolation.
3. After reviewing `supabase db push --linked --dry-run`, the operator may run `supabase db push --linked`. This task has not run either command.
4. Deploy this code, then verify keyword search, filters, pagination/counts, email applications, expired pages and sitemap timestamps.
5. From PowerShell 7, with only the public URL and anon key set in process environment, run `pwsh -NoProfile -File scripts/verify-live-anon.ps1`. It prints column names/results only, never keys or bodies. Denial requires SQL permission error 42501; outages fail closed. An empty table still proves SELECT permission. The script must PASS after 008; before 008 it should report EXPOSED for search_document, created_at, updated_at and status, then FAIL.
6. Rollback SQL is supabase/rollbacks/202611010008_public_search_boundary.sql (outside the forward migration directory). Restore the four grants and old expired RPC contract, and deploy v0.1.1 (the direct-table/textSearch application); the file is atomic and intended for a coordinated maintenance window. After manually rolling back the schema, record `supabase migration repair 202611010008 --status reverted --linked` so a later push can reapply it. Repair alone does not roll back SQL.

The PGlite security regression enumerates **every actual jobs column as owner**, switches to anon, and rejects SELECT of every column outside the shared allow-list. It verifies allow-list reads, select-star denial, search result columns, draft and expired exclusion, and rollback followed by reapplication. It runs without live credentials. This catches newly added columns accidentally granted to anon as well as all seven currently internal columns. The migration is applied twice in the regression to verify idempotence.
