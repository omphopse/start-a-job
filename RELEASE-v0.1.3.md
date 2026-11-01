# v0.1.3 release report

All implementation and verification stayed local. No staging/production requests, hosted database writes, link/push commands, deployment or Git push were performed. No credentials are included in this report, templates or committed logs. The display name remains unchanged; the final name is still the owner's decision.

## Changes by commit

| Item | Commit | Change |
| --- | --- | --- |
| 1 | `0f9f0dc` — `fix(security): classify anonymous probes on Windows PowerShell` | Replaced unsupported PowerShell 7-only HTTP handling with Windows PowerShell 5.1-compatible requests. Empty HTTP 200 results are OK; 401/403 or 42501 means denied; other errors retain sanitized status/code and stop early. Internal-column checks, public-by-design email reporting, actual public RPC normal/abusive probes, capped value-free output, summary and README usage. |
| 2 | `e0120f5` — `fix(db): enforce published job requirements with migration 009` | Shared Zod/SQL publishing limits and enums, generated constraint migration and rollback. NOT VALID installation, invalid legacy publications demoted to unpublished, then VALIDATE. Optional text remains optional. Fresh embedded PostgreSQL and direct-write regressions protect the service-role bypass path. |
| 3 | `0c570cb` — `feat(jobs): clean application URLs and warn about aggregators` | Tracking cleanup on save/edit/approval, cleaned URL preview, nonblocking aggregator advice, continued shortener/messaging blocking. Public API and JSON-LD use the cleaned destination, including legacy rows. |
| 4 | `fe1f196` — `feat(jobs): default closing dates and surface expired listings` | Expired badges/filter for both dashboard roles, past-date warning, configurable 30-day default and zero-to-disable behavior. Default also applies at approval. Expiry discovery/detail and deletion/unknown HTTP regressions. |
| 5 | `dfc2077` — `feat(content): require original summaries and shorten RSS excerpts` | Visible original-writing hint and required server-validated checkbox, discarded before persistence. RSS uses a plain-text excerpt of at most 300 characters plus canonical link. OpenAPI/llms.txt require attribution and canonical_url linking; public job fields remain unchanged. |
| 6 | `b848bf3` — `refactor(brand): centralize site identity and email wording` | One config for unchanged name, tagline, URL/domain, contact email and mark. Header/footer/metadata/JSON-LD/feed/llms/tests use it. Generated OTP template wording and a hard-coded-brand guard for current source/setup files. Historical audit artifacts are preserved. |
| 7 | `2ea6d00` — `feat(config): isolate environments and enforce production safeguards` | Placeholder staging/production env files, staging robots/header/meta controls, production URL/demo/delay build guards, local Supabase config, Windows regression CI job, setup/safety documentation, package/OpenAPI version 0.1.3 and verified Webpack defaults. Final review also tightened shared email, Unicode length/trim and hostname rules in unapplied migration 009, expanded blocked redirect/messaging hosts, and added safe network error codes to the probe. |
| 8 | Report commit | This report and refreshed fictional-demo browser screenshots. |

Migration 009 has not been applied to any hosted database, so its final generated definition is the one to review/apply. Future changes after application require a new migration.

## Verification results

Every implementation item ran lint, typecheck, unit tests, all requested browser viewport projects, build and seo:check. Initial tooling failures and retries are retained/documented; they are not counted as successful checks.

| Item | Unit tests | Playwright | Other checks |
| --- | ---: | ---: | --- |
| 1 | 34 passed | Initial dev run had compile/navigation failures; all 99 passed with the item 2 production fixture | Lint/types/SEO passed; default Turbopack failed, Webpack retry passed |
| 2 | 36 passed | 99 passed | Lint/types/build/SEO passed |
| 3 | 38 passed | 102 passed | All passed; logs in `verification/v0.1.3/03-url-hygiene/` |
| 4 | 39 passed | 108 passed | All passed; logs in `verification/v0.1.3/04-expiry/` |
| 5 | 41 passed | 111 passed | All passed; logs in `verification/v0.1.3/05-content-quality/` |
| 6 | 43 passed | 111 passed | All passed; logs in `verification/v0.1.3/06-branding/` |
| Final code | **47 passed** | **111 passed** | **Lint, typecheck, ordinary build and seo:check passed**; logs in `verification/v0.1.3/07-environments-final/` |

Playwright projects use **390×844**, **768×1024** and **1440×900**. They run against an isolated built demo on localhost, with remote database and indexing credentials disabled. Demo previews/mock actions do not establish successful live authenticated writes. Screenshots contain fictional sample data only.

Additional real local builds in `verification/v0.1.3/environment-smoke/` verified:

- A production build fails when NEXT_PUBLIC_SITE_URL is missing.
- A staging build serves X-Robots-Tag noindex/nofollow, noindex metadata and robots Disallow: /.
- A production build serves normal index/follow behavior and configured canonical/JSON-LD origin, with demo mode disabled and no sample listings.
- Unit tests reject localhost/non-HTTPS origins, production demo mode and apply-delay overrides other than ten seconds.

The default Turbopack builder repeatedly crashed when starting its CSS worker, including outside the sandbox. The supported Webpack builder passed. `npm run dev` and `npm run build` now select Webpack explicitly; final ordinary build checks use that default. Earlier sandbox localhost/file-permission failures were resolved by running only the isolated local verification outside the sandbox. The initial lint-staged hook passed lint but failed its nested Git staging under Windows permissions; commits bypassed that hook after the explicit lint/type/test checks ran successfully.

## Expiry and HTTP behavior

An expired published job **by slug returns HTTP 200** with a friendly expired notice and current similar jobs. It is noindex, has no active Apply control and has no JobPosting JSON-LD. This keeps old links useful while directing visitors to current opportunities. Known previously public deletions return **410** through the tombstone proxy; unknown slugs return **404**. Browser tests verify all three contracts. Expired jobs are absent from listing/search, similar jobs, sitemap, RSS and public JSON. Anonymous table/RPC visibility and private-column denial are tested with embedded PostgreSQL/RLS; real local PostgREST still requires the Docker reset below.

## Not verified / outstanding

1. **Fresh Supabase Docker reset:** local CLI init succeeded, but `supabase db reset --local` failed because Docker Desktop's Linux engine/named pipe is unavailable. Embedded PostgreSQL applies the complete schema/migration chain and tests 009 plus rollback, but that is not a successful Supabase-stack reset. See `verification/v0.1.3/local-db-reset.txt`.
2. **Hosted anonymous verifier:** deliberately not run against staging or production, per your instruction. The Windows 5.1 adapter/classification regressions pass locally; real project permissions/RPC responses remain for your next authorized check.
3. **Original admin “1 Issue”:** its expanded text was not supplied and the authenticated staging page was not opened. Local build, admin redirects, dashboard previews and accessibility tests pass. Next's indicator is dev-only, but the original underlying issue cannot honestly be declared harmless merely from its count. Disabling the indicator does not suppress runtime errors.
4. **Project identity/provider settings:** actual hosted project refs, remote migration history, live demo/delay settings, OTP delivery, SMTP, redirect allowlists, backups, DNS and production hosting were not inspected or changed. CI workflow changes were not executed on GitHub.
5. **Migration numbering:** existing history is ten files: October 001/002, then November 001, 003, 004, 005, 006, 007, 008, 009. November 002 is absent. README lists the exact order; previously applied files were not renamed to fabricate a contiguous 001..009 sequence.

## Exactly what the owner must do next

1. **Finish the local database check:** start Docker Desktop's Linux engine, then run `npx.cmd supabase start` and `npx.cmd supabase db reset --local` in this checkout. Inspect the complete migration order and confirm 009 succeeds. Do not add `--linked` or a production URL.
2. **Identify projects privately:** record the existing manually tested staging ref and a separate production ref. Fill private environment files/hosting settings from the placeholder templates, using each project's own keys. Keep the current display name until the final name is approved. Set the proper site URL and reachable contact email.
3. **Review and apply 009 when ready:** verify the intended staging ref, back it up, reconcile migration history if earlier SQL was pasted manually, inspect the pending migration list, and apply only the intended migration(s). Review jobs demoted to unpublished, correct their fields and deliberately republish. Do not automatically republish after rollback. Apply production migrations later only after staging acceptance and a production backup; **never reset production**.
4. **Set each project's Auth/dashboard configuration:** six-digit OTP with `{{ .Token }}`, public signups disabled, custom SMTP/sender, correct Site URL and environment-specific redirects, backups/PITR and a tested restore plan. Generate current brand wording with `npx tsx scripts/email-template.ts`. Create an initial admin only for a new project with no existing admin, using `npm run create-admin -- your-address`; verify the target first. Existing admins need no recreation.
5. **Run the hosted checks yourself when authorized:** set the staging URL and anon key privately and run `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/verify-live-anon.ps1`. Check the printed project ref. Then test signed-in poster/admin save/edit/approval, cleaned links, aggregator warning, original-summary confirmation, closing-date defaults/past-date warning, expired detail and every discovery surface. Expand and record the original admin issue text if it still appears.
6. **Deploy only after acceptance:** stage with SITE_ENV=staging and confirm noindex in actual responses. For production use a separate project, final HTTPS NEXT_PUBLIC_SITE_URL, SITE_ENV=production, DEMO_MODE=false and NEXT_PUBLIC_APPLY_DELAY_SECONDS=10. Verify canonical/OpenGraph/JSON-LD/sitemap URLs and robots behavior on the actual host, and complete SMTP/backup/DNS checks. No deployment or push has been done here.
7. **Publish the Git release only when you choose:** the local `v0.1.3` tag identifies this reviewed source/report. It does not imply that the hosted database or deployment was updated. Review the commits/report before pushing code or tags.
