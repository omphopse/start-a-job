# Independent launch audit — 1 November 2026

## Phase A verdict: NO-GO

Scope: committed HEAD `518f10d` and the separate, dirty working tree supplied by the owner. The initial tree is recorded in `verification/audit/initial-status.txt`. No application code was changed during Phase A. Audit harnesses and generated evidence are the only new files. Earlier chat summaries were not accepted as evidence.

The current application is substantially implemented, but public Supabase access exposes internal job columns, anonymous click RPC calls bypass the HTTP rate limiter, accessibility violations remain, deployment headers are incomplete, and production identity/hosting configuration cannot be certified. These are not assurances of zero vulnerabilities.

Precedence: the owner's recent instructions require a 10-second default and delayed email access; the older checklist's 12-second value and immediate server-rendered email link do not override those requests. Profile/account emails remain private; the recruitment email deliberately displayed to applicants is public application data. The checklist's disabled AI placeholder conflicts with the existing test explicitly requiring its absence; this is recorded as an unresolved requirement conflict, not silently changed.

## Evidence and reproducibility

All paths below are repository-relative. Raw artifacts are under `verification/audit/`. Values from `.env.local` were never printed. Screenshots contain fictional demo data, not authenticated customer records.

| Command / environment | Actual result |
| --- | --- |
| `git status --short` | FAIL clean-tree prerequisite: many modified/untracked owner changes; initial-status.txt records them. |
| `git log -6 --oneline`; `git tag --list` | HEAD 518f10d; v0.1.0 exists. git-log.txt records history. |
| Fresh `git clone --no-hardlinks` to `%TEMP%/deskjobs-audit-clean-20261101` | PASS clone of committed HEAD only; excludes uncommitted features. |
| Clean clone `npm ci` | PASS: added 489 packages in 3m; 20 moderate advisories; esbuild/unrs-resolver install scripts reported. |
| Clean clone lint/typecheck/unit/build | PASS: lint exit 0; route types generated; 11/11 tests, 8.28s; Next 16.4.3 compiled 19.8s, TypeScript 15.7s, static generation 1.26s. Tool transcript is primary evidence for these commands. |
| Working tree `npm run lint` | PASS exit 0, 34.35s; lint.txt. |
| Working tree `npm run typecheck` | PASS exit 0, 47.66s; typecheck.txt. |
| Working tree `npm run test:unit` | PASS 23/23, 26.86s test duration; unit.txt. |
| Working tree default production build | Initial Turbopack child-process failures; preserved build.txt and build-phase-a-unsandboxed.txt. Clearing generated `.next/cache` and rerunning `npm run build` passed; build-phase-a-clean-cache.txt. No source/build-command workaround was applied. |
| Diagnostic Webpack build | Initially failed on types in the new audit harness, not app source; harness corrected. Do not count this attempt as an application PASS. |
| Working tree Playwright | First attempt server timeout; retry PASS 69/69 in 3.4m, all 3 projects; playwright-phase-a-retry.txt. |
| Clean clone Playwright and SEO | Running at report creation; final results must be appended before final certification. clean-clone-playwright.txt and clean-clone-seo.txt. |
| Working tree `SEO_BASE_URL=http://localhost:3100 npm run seo:check` | PASS five no-JS job pages, named bots, four XML sitemap documents and jobs.json schema; seo-phase-a.txt. |
| Clean clone `npm run start -- --port 3300` | PASS ready in 589ms; DEMO_MODE=true and blank Supabase variables, all documented in .env.example. No real OTP/admin database used. |
| `node verification/audit/browser-audit.mjs` | PASS no horizontal overflow on 65 page/width combinations; 25 screenshots captured; two axe color-contrast violations. browser-phase-a.json. |
| `npx tsx verification/audit/db-probe.ts` | Executed all migrations against local PostgreSQL WASM/PGlite with simulated auth claims; all eight tables have RLS; direct anonymous RPC accepted 40 clicks; internal columns exposed. db-phase-a.json. This is NOT a real Supabase/JWT test. |
| `node verification/audit/live-anon.mjs` | Real read-only anon HTTP requests: jobs 200, one row, internal columns exposed; profiles/clicks/reports/request_limits 200 with zero rows. Only status/count/column names recorded. live-anon-phase-a.json. No live writes or OTP emails sent. |
| `node verification/audit/static-audit.mjs` | Regex scan of working source and all git revision patches: no matching committed secret; ignored .env.local lines 3/4 contain JWT credentials (public anon and server key), values redacted. 17 production JS files scanned; no service key name/value found. static-phase-a.json. Pattern scan has false-negative risk; not a full gitleaks scan. |
| `npm audit --omit=dev --json` | PASS 0 known production advisories; npm-audit-production.json. |
| `npm audit --json` | 20 moderate dev-tool advisory chains; 0 high/critical; npm-audit-all.json. No forced downgrade applied. |

## Requirements traceability

PASS below means only the evidence described, never an untested production guarantee. PARTIAL indicates code/local behavior exists but live behavior or edge coverage is missing.

| Requirement | Phase A | Evidence / limitation | Severity if not PASS |
| --- | --- | --- | --- |
| Clean git/reproducible release/tag | FAIL | Initial status dirty; v0.1.0 exists; fresh committed clone passes build but does not include current features. | High release process |
| Documented env only | PARTIAL | static-phase-a.json: PERF_REQUESTS, SEO_BASE_URL undocumented; NODE_ENV is framework-owned; PLAYWRIGHT_TEST in next.config.ts also test-only. No documented variable unused in scanned app/lib/scripts. | Low |
| Netlify build configuration | PARTIAL | netlify.toml: npm run build, .next, Node 24; auto OpenNext adapter supported by Netlify docs. No actual Netlify deploy executed. No standalone Vercel SDK dependency. | Medium |
| Fresh local Supabase/reset/migration order | PARTIAL | Supabase CLI not found; PGlite applies migrations in order, removing only pgcrypto extension setup. Docker executable exists, daemon/local Supabase not established. | High verification gap |
| Seed sample labeling | PARTIAL | tests/unit/jobs.test.ts passes 10 fictional companies/example.com links; scripts/seed.ts inspected. Real seed insertion not executed. | Medium |
| create-admin / idempotence | PARTIAL | scripts/create-admin.ts creates auth user/profile and compensates failed profile insert; refuses when any admin exists. Replay exits nonzero, not idempotent success. No disposable Auth service available. | Medium |
| Home, jobs, details, trust pages | PASS local | portal.spec.ts, branding.spec.ts and 65-route geometry audit. | — |
| Search / URL filters / sort / 20/page | PARTIAL | portal.spec.ts verifies keyword/category; app/jobs/page.ts and lib/data.ts implement sort/pagination, default 20. Demo dataset has 10, so multi-page navigation not proven. | Medium |
| Sitemap / robots / friendly 404 | PASS local | seo:check, seo.spec.ts, browser-phase-a.json; app/not-found.tsx. | — |
| Generic 500 | PARTIAL | app/error.tsx contains generic text and reset; no forced production failure exercised. | Low |
| Published/non-expired lists, feeds, API, sitemap | PASS local | current visibility unit test, api.spec.ts, portal.spec.ts, lib/seo/sitemap.ts, feed.xml route; expired API 404. Live hidden-status reads not exhaustively exercised. | — |
| Expired detail / similar jobs / no JobPosting | PASS local | portal.spec.ts and seo.spec.ts; app/jobs/[slug]/page.tsx gates schema/apply by isCurrent. | — |
| Public site no login | PASS local | Browser audit public routes; proxy matcher protects admin separately. | — |
| Detail layout order | PASS local | All five detail screenshots inspected: header, summary/facts, checklist/details, apply. Sticky bar is viewport-fixed, not inserted into semantic flow. | — |
| URL real SSR anchor + target/rel | PASS local | seo:check no-JS HTML; application.spec.ts/portal.spec.ts assert https href, target=_blank and noopener noreferrer nofollow. | — |
| Countdown default/config / disabled click / progress / live announcements | PASS local | application.spec.ts, apply-panel.tsx; default 10 follows recent request; 2-second test override. aria-disabled/click preventDefault is UI gating, not a secrecy boundary. | — |
| Email delayed disclosure | PASS local | application.spec.ts + application-method.test.ts: no mailto in initial HTML, disabled control, reveal at timer end. Email remains in serialized props/public recruitment data; not a secret. | — |
| Host + safety note | PASS local | apply-panel.tsx + five detail screenshots; host and never-pay note visible. | — |
| Sticky mobile apply / shared state / no covered final content | PARTIAL | mobile-apply uses same state; screenshots show bar over intermediate content while fixed. Need explicit end-of-page overlap assertion, including mobile safe area. | Medium |
| Anonymous click recording bounded / RPC-only | FAIL | db-phase-a.json proves 40 direct anonymous RPC calls; route limiter is bypassable at Supabase endpoint. HTTP path validates UUID. | High |
| Report persistence | PARTIAL | report.spec.ts verifies demo explicitly does not save; report server action uses service role after Zod/rate limit/current-job check. Real insertion not performed. | Medium |
| Ads separated from apply | PASS disabled configuration | ad-slot.tsx returns null with blank client; detail screenshot has no ad. Enabled placeholder rendered in sidebar/other positions, no real AdSense loaded. | — |
| OTP six-digit / no signup | PARTIAL | login actions regex /^\d{6}$/, shouldCreateUser:false; auth.spec.ts checks UI with mocked action. Real delivery/expiry/unknown-email equivalence not exercised. | High verification gap |
| Active profile checked every request | PARTIAL | lib/auth.ts verifies claims and rereads is_active via request-scoped React cache. Local DB inactive write/read denied; real stale JWT/session not tested. | High verification gap |
| Admin team/review/edit/unpublish/delete/direct publish | PARTIAL | users/review/jobs actions call requireProfile(true) where required; schema triggers/RLS and previews tested. No authenticated live lifecycle. | High verification gap |
| Poster isolation and no publishing | PASS local DB / PARTIAL live | rls.test.ts rejects publish/protected review changes and hides other's draft. App rejects edits to published jobs rather than automatically resubmitting them. Real session matrix missing. | High verification gap |
| Rejection reason visible to poster | PARTIAL | dashboard.tsx / review action; no full live reject/edit/resubmit lifecycle. | Medium |
| Disabled AI placeholder | FAIL / conflict | dashboard.spec.ts explicitly expects no Generate summary with AI button; job-form.tsx has none. Needs owner decision before changing a deliberately tested requirement. | Low |
| AdSlot env/reservation/label and ads.txt | PARTIAL | ad-slot.tsx conditional null, aria-label Advertisement, minHeight 120; report.spec.ts checks ads.txt 200. Real ad/script/consent/CLS not tested. | Medium |
| Unique metadata/canonical/OG | PARTIAL | seo.spec.ts, branding.spec.ts, lib/seo/metadata.ts; no exhaustive uniqueness assertion across arbitrary records. | Low |
| JobPosting visible match/deadline/no invented salary | PASS local | seo.test.ts, seo:check, jobSchema implementation. Empty state/city handled; country persisted. | — |
| Breadcrumb/Organization/WebSite | PASS local | JSON-LD scripts in page and schema helpers; seo:check. | — |
| Named search bots / training toggle / admin blocked | PARTIAL | robots route explicitly lists seven bots and toggle; seo:check verifies current response; opposite toggle not exercised in a second running server. | Low |
| Sitemap hierarchy/lastmod/revalidation | PARTIAL | seo:check traverses four XML documents; revalidate calls in save/review/expire. Real publish/CDN invalidation and scheduled expiry not tested. | Medium |
| IndexNow/Google helpers nonblocking/no-env | PASS local | notify unit test passes; after callbacks, Promise.allSettled, 5s network timeouts. Real search-console credentials not used. | — |
| Category/location landing and thin noindex | PASS local basic | landing.spec.ts checks accounts/Pune and empty unknown city noindex; lib/landing.ts count-zero rule. One-item thin pages remain indexable; no defined threshold >0. | — |
| Public JSON/feed/OpenAPI/llms | PASS local | api.spec.ts, branding.spec.ts, seo:check. | — |
| Public data excludes private columns on ALL access paths | FAIL | Real anon REST select=* includes created_by, approved_by, rejection_reason, search_document; expired RPC returns full jobs composite locally. App JSON mapper itself excludes them. | High |
| Screenshots at five widths | PASS local preview | 25 full screenshots + five contact sheets in screenshots/audit, all inspected. Dashboard is clearly read-only demo, not actual authenticated admin. | — |
| No horizontal overflow | PASS tested routes | 65 combinations: 13 paths × 360/390/768/1024/1440, browser-phase-a.json. Arbitrary user content/path variants are not exhaustive. | — |
| Target size ≥44px / tiny text | FAIL | browser-phase-a.json lists small nav/popular/footer/sort/report controls. Card title bounding boxes understate effective full-card pseudo-element hit areas; job-card.spec.ts verifies actual hit areas. Small nav text wraps at 360px. | Medium |
| Accessibility axe | FAIL | Home: serious color contrast, 6 nodes; detail: serious color contrast, 1 node; jobs/login no violations in selected WCAG A/AA tags at 390px. | Medium |
| Mobile Lighthouse / field CWV | PARTIAL | Clean committed production measurements below; current source production rerun required. Field INP/CrUX cannot be established locally. | Medium |
| Secret hygiene | PARTIAL | All-history regex scan found no matches; ignored env contains credentials; no matching tracked env/key files. .gitignore lacks generic *.key/p12/pfx exclusions. No gitleaks/trufflehog installed. | Medium |
| Client bundle secret scan | PASS narrow scan | 17 JS files; service key exact value/name and key/JWT patterns absent. Does not prove no encoded/novel secret leakage. | — |
| Real anonymous DB negative matrix | PARTIAL | live-anon-phase-a.json read-only probes; no live mutations attempted because target is owner's configured project, not disposable staging. | High verification gap |
| Every public table RLS / fixed definer paths | PARTIAL | Local all eight tables RLS=true; inspected migrations use fixed search_path=public. Functions is_admin/is_poster/remember_deleted_job retain default PUBLIC execute; no SQL views created. Real schema drift not inspected. | Medium |
| Auth rate limits / enumeration / brute force | PARTIAL | login actions: per-IP 10/10min, send 3/email/10min, verify 8/email/10min; identical successful send message; provider failure timing/exceptions could differ; real SMTP/provider config untested. | High verification gap |
| Secure cookies/logout | PARTIAL | server.ts and proxy.ts set httpOnly, sameSite=lax, secure in production; logout calls signOut. No localStorage use found in application. Real cookies and revocation untested. | High verification gap |
| Every admin page/action server protected | PARTIAL | requireProfile on pages/actions plus role checks; no-session route redirects tested. Full authenticated/inactive/action invocation matrix missing. | High verification gap |
| Installed versions/advisories | PASS prod scan / PARTIAL supply chain | Next 16.4.3, React/DOM 19.3.1, Supabase SSR 0.12.7/client 2.118.0; npm production scan 0. October Next advisory fixed at 16.4.1; installed above threshold. Dev tools have 20 moderate chains. | Medium |
| Zod coverage / mass assignment | PARTIAL | Job/user/review/landing/category/report/login/public APIs validate schemas; cron token uses timingSafeEqual rather than Zod (appropriate). logout/no-input actions need no payload schema. Locations kind validated manually. DB trigger protects publish/review fields. | Low |
| ≥20 malicious URL tests | NOT VERIFIED | Existing validation tests reject key schemes/credentials/shorteners/private IPs; complete 20-case audit corpus not yet executed at this snapshot. | Medium |
| XSS / JSON-LD escape / all text fields | PARTIAL | Only app dangerouslySetInnerHTML is components/json-ld.tsx, replaces < with \\u003c. React text rendering used. Malicious payload matrix across every field not yet executed. | Medium |
| SQL injection / query sanitization | PASS source / PARTIAL runtime | Supabase query builder; SQL tests parameterize values; textSearch websearch, ilike strips %/_. No raw client-controlled SQL found; fuzz runtime not exhaustive. | Low |
| Open redirects / SSRF | PASS source bounded scope | notify same-origin URLs and fixed external endpoints; locations fixed CountriesNow origin with encoded query; redirects local fixed paths. External application anchors intentionally user-supplied but validated, not server-fetched. | — |
| CSRF/origin enforcement | PARTIAL | Next server actions built-in checks; apply-click POST has no explicit origin validation, can be called cross-site without cookie credentials. Cron bearer protected; no mutating GET found. | Medium |
| Security response headers | FAIL | browser headers include nosniff, referrer, Permissions-Policy, X-Frame-Options; CSP and HSTS absent. HTTPS hosting header behavior unverified. | Medium |
| Public API CORS/caps/rate limits/errors | PASS local basic / PARTIAL abuse | GET/OPTIONS only, limit max100, api.spec.ts invalid101→400/POST405, generic503 catch. Rate limit trusts deployment-specific IP headers; edge overwrite policy unverified. | Medium |
| Error responses/logs secret-free | PARTIAL | Generic catches and error.tsx; provider notification error.message logged, potential credential-bearing Zod issue data not exhaustively tested. No exhaustive log/failure injection. | Medium |
| Admin noindex / absent sitemap | PASS local | admin/layout.tsx robots false; robots route; sitemap only trust/jobs/category/location pages. seo:check. | — |
| Lockfile / dependencies / install scripts | PARTIAL | package-lock.json tracked; no @vercel package required; @next/env imported from transitive Next package by scripts (should be explicit). eslint/lighthouse tooling used. Known install scripts listed; no full code review of transitive scripts. | Medium |

## Security findings

| ID | Severity | Finding / evidence | Recommended fix |
| --- | --- | --- | --- |
| SEC-01 | High | Direct anonymous REST reads expose internal job columns; real HTTP evidence live-anon-phase-a.json and local expired RPC columns in db-phase-a.json. | Explicit anon column grants; use public projections on app reads; project expired detail RPC to a safe return shape. Retest query permissions and RLS. |
| SEC-02 | High | Direct anonymous log_apply_click executes without bound; db-phase-a.json count40. HTTP app limiter cannot protect direct PostgREST. | Revoke anon/authenticated execution; allow service_role only through validated, rate-limited server endpoint; DB-level bounded argument validation. |
| SEC-03 | Medium | Missing CSP/HSTS, confirmed local headers. | Add compatible CSP/frame-ancestors/base-uri/object-src and production HSTS, verify real HTTPS deployment. |
| SEC-04 | Medium | 20 moderate dev dependency chains (glob cancellation bypass GHSA-3g3m-2fjr-6pw4, minimatch amplification GHSA-g3hv-75wg-m249). | Upgrade supported tooling after compatibility review; do not npm audit fix --force into proposed eslint4/config0 downgrade. Dev-only; no production reachability established. |
| SEC-05 | Medium | No real authenticated JWT abuse/lifecycle evidence; live owner project is not a disposable test target. | Provision isolated staging Supabase/users; execute matrix without using production data. |
| SEC-06 | Medium | apply-click lacks explicit origin check; IP identity depends on trusted proxy overwrite. | Validate Origin when provided; require correct origin for browser writes; verify Netlify/Cloudflare cannot pass spoofed IP headers. |
| SEC-07 | Low | .gitignore excludes pem/service-account names but not generic key/p12/pfx files. | Extend patterns; scan full history with dedicated scanner in CI; enable provider secret scanning. |
| QA-01 | Medium | Axe serious contrast on home/detail, counts above. | Darken muted text and add automated axe regression. |
| QA-02 | Medium | Small interactive controls, especially mobile nav/sort/report/popular links. | Provide ≥44px hit areas; verify geometry includes stretched card links and no new overflow. |
| QA-03 | High process | Uncommitted release cannot be reproduced from HEAD or v0.1.0. | Preserve owner work; do not silently commit it as an audit fix. Review/baseline separately before final release tag. |
| QA-04 | Low | Missing disabled AI placeholder contradicts existing tests/newer UI. | Owner requirement decision; do not delete/weaken existing test to force PASS. |

## Lighthouse (clean committed clone, production localhost:3300)

These are lab results for committed HEAD, not the current uncommitted source or public hosting. Full reports: lighthouse-phase-a-{home,listing,job}.json/html.

| Page | Performance | SEO | Accessibility | Best Practices | LCP ms | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Home | 99 | 100 | 96 | 100 | 780.83 | 0 |
| Jobs | 97 | 100 | 100 | 100 | 767.19 | 0 |
| Detail | 89 | 100 | 95 | 100 | 807.39 | 0 |

Field INP and real Core Web Vitals are NOT VERIFIED. TBT is available in the full report but is not equivalent to field INP.

## Visual review

Inspected five contact sheets containing all 25 screenshots, plus automated geometry. No clipped cards/hidden main actions or horizontal overflow found at the five requested widths. At 360px the compact nav labels wrap and are small; secondary link hit areas are below44px. Fixed mobile apply is intentionally visible above document flow; screenshot alone does not prove safe-area/end-of-content behavior. Authenticated dashboard screenshots are NOT VERIFIED: all captured dashboards are explicitly labeled read-only fictional previews.

## NOT VERIFIED / manual checks for the owner

- Isolated Supabase: install CLI, run supabase start/db reset, seed, create-admin twice, and real anon/poster/admin/inactive JWT negative/write tests. Never run destructive probes against production.
- Supabase dashboard: six-digit email OTP enabled; email template displays code rather than magic link; public signups disabled; shouldCreateUser:false verified end-to-end; SMTP delivery, provider rate limits/expiry and account-enumeration timing checked.
- Verify RLS/column grants/functions on every deployed table/view, including drift outside repo migrations; ensure security_invoker for any added views. Apply audited migrations before deployment.
- Test poster deactivation with an already-issued JWT immediately, server actions without middleware, logout cookie clearance, passwordless session expiry, and no browser token storage.
- Confirm Netlify production build/OpenNext adapter, environment keys server-only, cron expiry scheduling, cache invalidation after publish/unpublish/delete, and CountriesNow outbound connectivity.
- Netlify/Cloudflare bot/WAF rules must allow Googlebot, Bingbot, OAI-SearchBot, Claude-SearchBot, PerplexityBot and named user bots; test actual public URLs without CAPTCHA/login.
- Confirm HTTPS/domain DNS, HSTS and CSP on the deployed domain; review CSP/consent/ad behavior with actual AdSense enabled. No live advertising integration certified.
- Verify Search Console/Bing ownership and structured data/indexing reports; configure IndexNow/Google credentials and inspect notifications.
- Enable GitHub secret scanning and Dependabot; install gitleaks/trufflehog CI scan, including full history; if any real server key is exposed, revoke/rotate in Supabase, replace deployment secrets, rebuild, invalidate old sessions where necessary, then rescan history and bundles.
- Configure database backups and test restore, monitoring/uptime/error alerts, log retention/redaction, abuse monitoring and rate-limit cleanup. Establish field CWV/INP monitoring.
- Resolve 12-vs10 timer and AI-placeholder checklist drift explicitly; current recent 10-second user instruction remains authoritative. Review every residual PARTIAL/NOT VERIFIED row before GO.

Phase A final verdict: **NO-GO** until high database issues are fixed/applied, current release is reproducible, and production authentication/hosting checks are completed. This audit cannot guarantee absence of all vulnerabilities.

## Phase B — verified source fixes

Each fix below has its own Conventional Commit. Every gate was run before its commit: lint, typecheck, full unit suite, all three Playwright projects, and production build. Expected failing-before regressions and unsuccessful infrastructure attempts remain in the evidence directory. No existing test was skipped or deleted. The original RLS assertions were preserved before applying the new privacy migration; additional post-migration checks assert stronger restrictions.

| Finding | Commit | Regression / final gate evidence |
| --- | --- | --- |
| SEC-01 anonymous table and expired-RPC metadata | 79de04b | sec01-before.txt fails private-column denial; sec01-{lint,types,unit,build,playwright}.txt: 24 unit / 69 browser PASS. |
| SEC-02 direct RPC limiter bypass + SEC-06 cross-origin clicks | b3f39b1 | sec02-before.txt fails execute-privilege assertion; sec02-* final gates: 25 unit / 72 browser PASS. RPC now server role only; HTTP checks origin/UUID/limiter. |
| SEC-08 malformed URL exception and normalized embedded controls (found during Phase B) | 3d2974e | sec08-before.txt, sec08-unit.txt record failures; sec08-*-final.txt: 26 unit / 72 browser PASS. 26 rejected URL cases + 3 valid cases. |
| SEC-09 authenticated cross-poster metadata (found during Phase B) | cba7d2f | sec09-before.txt returns another poster's private row, then source fix denies it and preserves owner access. 26 unit / 72 browser PASS. First 4-worker run had a Next dev-server JSON parsing error; unchanged 2-worker rerun passed, both logs retained. |
| QA-01 contrast, QA-02 control hit areas and sticky footer overlap | 7b99e82 | qa01-before.txt: all three new tests fail; qa01-targeted.txt retains remaining popular-link failure; final qa01-* gates: 26 unit / 81 browser PASS. Explicit axe-core test dependency added. |
| SEC-03 baseline CSP and HSTS | 3de59b1 | sec03-before.txt fails header assertions; sec03-* gates: 26 unit / 84 browser PASS. CSP protects objects/base/framing/form destinations; it does not restrict script execution. Strict script CSP/real advertising remains unverified. |
| QA-04 disabled AI placeholder | 9e77eda | qa04-before.txt fails absence; qa04-* gates: 26 unit / 87 browser PASS. Added explicitly disabled “AI summary (coming soon)”; existing legacy-control absence assertion unchanged. The earlier checklist conflict is resolved without claiming a working generator. |
| SEC-07 secret-file containers | 8edf5e2 | sec07-before.txt proves four paths not ignored; sec07-* gates: 27 unit / 87 browser PASS. key/p12/pfx and underscore service-account patterns added; .env.example remains trackable. |
| QA-05 email apply click not recorded (found during Phase B) | 704e40c | qa05-before.txt fails expected click request; qa05-* gates: 27 unit / 90 browser PASS. Test intercepts request, prevents external mail app launch and asserts only job_id is sent. |
| QA-06 SEO checker assumed immediate emails and mandatory city (found during Phase B) | 4b3709e | qa06-before.txt: 2 failures/1 pass with real rendered HTML/schema; qa06-* gates: 30 unit / 90 browser PASS. URL href/rel checks retained and target check added; email requires disabled countdown and no immediate mailto; empty city requires omitted locality. |

The previously uncommitted implementation was preserved separately in 7b65411 rather than hidden inside security commits. Phase A report commit is 8624819.

### Final local SQL and real-service observations

`AUDIT_PHASE=phase-final npx tsx verification/audit/db-probe.ts` passed: all 8 local public tables have RLS; anonymous private-column access is denied; 40 direct anonymous click attempts are denied; expired RPC fields omit creator/reviewer/rejection/search metadata; a deactivated owner's write to an otherwise editable draft affects zero rows. Existing click/report rows are seeded for meaningful private-read checks. These are actual PostgreSQL-engine queries with simulated claims, not real signed JWTs.

`AUDIT_PHASE=phase-final node verification/audit/live-anon.mjs` made read-only HTTP requests against the configured owner project. Draft, pending, rejected, unpublished and expired queries all returned zero rows. **The live project's unrestricted published-job query still returned internal column names**, so SEC-01 is fixed locally but remains a known deployed exposure until the owner applies the security migrations. No live mutation, OTP delivery or production schema change was performed.

`node` fetch to the real CountriesNow state endpoint returned HTTP200 / 37 states. This proves the local Node runtime can reach the provider, not that Netlify outbound access is configured.

Environment scan now covers app/components/lib/scripts plus next.config.ts, proxy.ts and Playwright config. All application/tool variables are documented; NODE_ENV is explicitly documented as framework-managed. Python3.11 `tomllib.load(netlify.toml)` parsed build command/publish directory/Node24 successfully. Actual Netlify deployment remains unverified.

Final source/history/bundle pattern scan: no matching working-tree/history secret, no service key name or exact value in 17 production JS chunks. Scope now includes tracked/untracked nonignored text artifacts, separately scans ignored local env and production static chunks. Ignored local env credentials are expected and were not committed. Regex scanning is not equivalent to dedicated gitleaks/trufflehog or a proof of absence.

Final clean-clone verification, refreshed production screenshots/Lighthouse and the complete before/after matrix will be appended after those commands finish. Until then, this remains **NO-GO**.

### Final-review finding: deletion-history privacy (SEC-10, High)

The initial migration recorded every deletion and let anonymous readers enumerate `deleted_jobs`, including slugs from never-published drafts. `sec10-before.txt` proves the local public result included a private draft slug and an unclassified legacy record. Migration `202611010007_tombstone_privacy.sql` now records `was_public=true` only when the deleted row had a publication timestamp and filters anonymous reads by that flag. Legacy records are retained with false by default, so unknown history stays private. Verified previously public legacy slugs may be reclassified by the owner; unclassified old public deletions return missing rather than HTTP410 until reviewed. New public deletions retain HTTP410 semantics.

All sec10 gates passed: lint/types/build exit0, 31 unit tests and 90 browser tests. The original regression verifies both privacy and retention of old records without weakening any existing test. The first final clean clone of 9fa4d47 passed install/lint/types/30 unit/build/90 browser gates; those results are preserved under `clean-candidate-before-tombstone/` and are superseded by a second clean clone including migration007.
