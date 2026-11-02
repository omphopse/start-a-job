# v0.1.4 local verification and staging handoff

Date: 2026-11-02 (Asia/Kolkata). Work remains local; no push, migration application to a hosted project, or deployment was performed.

## Changes and commits

- Item 1: `7e6e04c` — remove public qualification/experience filters and silently ignore old parameters. Admin fields, job attributes, fresher tags and JSON-LD stay available.
- Item 2: `1c01412` — database-backed cascading location filters, migration 010 and rollback, shared location normalization and server adapter fallback.
- Item 3: `d0ceed8` — expanded RPC/publication/column/permission/cap tests, responsive and SEO tests, live anon probe updates and canonical alias consistency.
- Item 4: release metadata, OpenAPI and this staging handoff; local tag `v0.1.4` is created on the final commit.

## Verification

All checks use the local demo fixture and embedded PostgreSQL, not a hosted Supabase project.

| Item | Lint | Typecheck | Unit tests | Playwright | Build | SEO |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS | PASS | 48 PASS | 114 PASS | PASS | PASS |
| 2 | PASS | PASS | 51 PASS | 117 PASS | PASS | PASS |
| 3 | PASS | PASS | 52 PASS | 123 PASS | PASS | PASS |
| 4 | PASS | PASS | 52 PASS | 123 PASS | PASS | PASS |

Playwright projects: 390×844, 768×1024, 1440×900. Additional loaded filter checks cover widths 360, 390, 768, 1024, 1440, keyboard focus, 44px controls, country hiding, cascading state/city counts and reset/disabled behavior, remote jobs, shared URL restoration, provider-unavailable browser routes, retired parameters, aliases, empty results, canonicals and noindex. The expanded mobile sheet was visually inspected. Existing automated accessibility, authoring, details and JSON-LD tests pass.

Embedded PostgreSQL applies the migration chain. Tests verify published/non-expired visibility, all excluded moderation states, public list projection, denied private table columns, normalized country/state/city matching, oversized/special/SQL-looking/unknown inputs, unsupported retired RPC arguments, and rollback. Facets expose exactly country/state/city/job_count, clamp to at most 500 location groups (including oversized and negative limits), reject invalid types, use SECURITY DEFINER with fixed search_path, grant only anon/authenticated execution, and deny outsider/default service-role grants. No public.jobs column grant is widened.

The updated live anon script was checked locally (including Windows PowerShell parsing, mock responses and projection guards) but **was not run against a hosted database**.

Local check command: `node scripts/verify-filters-local.mjs release`. Logs: `%TEMP%/deskjobs-v014/{item1,item2,item3,release}`; generated logs and screenshots are not committed.

## Location source and limits

The existing authoring component is `components/location-fields.tsx`, calling `/api/locations`. The server source is CountriesNow, `https://countriesnow.space/api/v0.1/countries/`: `iso`, `states/q`, `state/cities/q` (or `cities/q`). `lib/location-provider.ts` now owns this adapter: two-second timeout, daily Next.js cache revalidation and bounded seven-day stale-name fallback. `lib/location-names.ts` shares NFC/whitespace/alias normalization with authoring validation, public query validation and facets; PostgreSQL alias behavior is checked against the same map.

Public visitors receive published database facets; neither their browsers nor the public listing server path need a provider request. Cold provider outages therefore still leave public filtering available from database values. Authoring retains its current values and retry UI when neither provider nor stale cache is available. Live CountriesNow availability and hosted PostgREST behavior were not verified.

Facet options are the first 500 distinct location groups in deterministic name order. Counts describe all current jobs at each returned location, independent of other filters; URLs can still query a valid location outside the cap. Dependent options are preloaded server-side, update synchronously and are disabled until a parent is selected. The page loading state covers initial facet loading.

## Verification-harness correction

An initial attempt used the existing PowerShell harness. Windows PowerShell removes environment variables set to an empty string, allowing Next.js to reload `.env.local`; that attempt could have made Supabase reads. It was stopped after reaching non-fixture pages. No hosted migration/reset command, deployment or push was executed. The harness now delegates to Node, preserves explicit empty credential values for build/server/tests/hooks, and verifies the exact demo fixture before browser tests. All reported successful runs above were repeated with that corrected isolation. No credentials were printed or committed.

## Manual staging gate

1. Confirm the linked project is **STAGING**. Apply `supabase/migrations/202611020010_public_location_filters.sql` there. If using your chosen reset workflow, run `supabase db reset --linked` **only after confirming the linked target is STAGING**.
2. Re-run `scripts/verify-live-anon.ps1` with the staging URL/public anon credential supplied securely through the process environment. Require PASS, including new facet and list parameter abuse probes. Do not use a service-role key or print credentials.
3. Publish non-expired jobs in several states/cities; compare admin names, facet counts, list results, shared URLs, old links, empty states and SEO. Include another country and a remote job to exercise both country visibility and remote filtering. Confirm non-public/expired jobs remain absent. Test provider failure while database-backed filtering remains usable.
4. If rollback is needed, use `supabase/rollbacks/202611020010_public_location_filters.sql` with the previous application code; it restores the prior list RPC signature.

**Do not apply this migration to production until staging passes. Never run `supabase db reset` against production.** GitHub push and CI remain for you to perform/review.
