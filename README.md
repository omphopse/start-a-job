# startajob — Phase 1

A fresher-focused job directory for India. Visitors browse without accounts and follow official application links. Approved posters submit drafts; active admins review and publish them.

## Run locally

Install Node.js 24 LTS and Git, then open a terminal in this folder:

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open http://localhost:3000. With empty Supabase keys and `DEMO_MODE=true`, ten clearly labelled fictional jobs appear. Demo dashboard previews are at `/demo/dashboard`, `/demo/job-form`, `/demo/review`, and `/demo/users`. These are read-only, contain no real account data, and return 404 when demo mode is off or Supabase is configured. Real `/admin/*` pages remain protected.

Follow [SETUP.md](SETUP.md) to connect Supabase, create an admin, configure email OTP and deploy. Never publish sample listings as real recruitment.

## Commands

```powershell
npm run lint
npm run typecheck
npm run test:unit
npx playwright install chromium
npm run test:ui
npm run build
npm start
npm run seo:check
npm run lighthouse
npm run create-admin -- you@example.com
npm run seed
npm run format
```

`seo:check` and Lighthouse need a running server with at least five current jobs for the five-page SEO check. Use a separate staging database or local demo data. `SEO_BASE_URL` overrides localhost. Playwright starts an isolated demo development server on port 3100 with Supabase credentials cleared, uses a two-second apply delay, and captures screenshots in `/screenshots` at 390×844, 768×1024 and 1440×900. Overflow checks additionally cover 360 and 1024px. Your normal localhost:3000 development server can remain running during browser tests.

The feature verification sequence is `scripts/verify.ps1` on Windows. CI runs the equivalent commands on Linux. Husky runs lint-staged and a project-wide typecheck before commits. Tests use PGlite (real embedded PostgreSQL) for RLS and trigger assertions; it supplies a minimal Supabase Auth schema. Staging tests must also verify real Supabase sessions and email delivery.

## Architecture

- Next.js 16 App Router, TypeScript, React and Tailwind. No deployment-vendor SDKs or Vercel packages.
- Public content renders on the server for every request, including expiry-sensitive queries. No stale ISR window for expired vacancies. Next.js `proxy.ts` is the current middleware convention.
- `lib/supabase/public.ts` uses an anonymous client; `server.ts` creates the cookie-aware SSR client and a server-only service client.
- Database policy definitions and comments are in `supabase/migrations`. Apply them once, in filename order. No migrations run automatically during a build.
- Public pages use RLS. An expired-only RPC supports friendly archived detail pages; deleted slugs are retained as tombstones and return HTTP 410.
- Website application links are real HTTPS anchors in initial HTML. JavaScript supplies a countdown, click prevention during the wait, and anonymous click logging. Without JavaScript the website link works immediately. Email applications require JavaScript to reveal the address and mailto action after the countdown; their click logs also contain only the job ID.
- Full-text search uses PostgreSQL's English index. Category/location pages have editable original introductions and safe fallbacks.
- Public API responses contain an explicit field allowlist. RSS, OpenAPI and llms.txt are public. No account emails, review feedback or analytics are included.
- OTP/report/API rate limits use an atomic database function in production. Only deployment-provided Netlify/Cloudflare IP headers are used. Local demo limits use memory and reset with the server. Hosts without those trusted headers share the fallback bucket; adapt the identity adapter before deploying elsewhere.
- Optional SEO notifications run with Next.js `after()`, have timeouts and catch failures. Logs contain provider status/errors, never credentials. Configure provider keys to enable them.
- Ads are preparation only: labelled reserved containers, no external advertising scripts or tracking loaded. Add approved AdSense unit integration and any legally required consent handling before enabling real ads.

## Data and operation

All deadlines use Asia/Kolkata calendar dates. A missing deadline means the reader must check the official notice. Salary text is displayed verbatim; no numeric `baseSalary` is invented from unstructured text. Remote jobs include India applicant-location requirements in structured data.

Safety checkboxes and URL validation support editorial review; the application cannot automatically prove that every HTTPS domain belongs to an employer. Admins must inspect the original source. Messaging links and common shorteners are blocked, with an additional environment blocklist.

Use the daily expiry endpoint and maintenance checklist in SETUP.md. Keep reports free of personal information and apply your published retention schedule. The generated contact email and operator wording are placeholders until configured/reviewed by the owner.

## Verification records

Screenshots are saved in `screenshots/`; final reference PNGs are committed in the documentation commit. Production Lighthouse JSON/HTML and the final verification summary are in `verification/`. Lab Lighthouse scores do not establish field INP or guarantee performance on a deployed host. No remote push or deployment is performed by this build.

### Anonymous boundary verification (Windows PowerShell 5.1)
Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the current process, then run `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/verify-live-anon.ps1`. This explicitly contacts that project; check the printed project ref first. Never use a service-role key. The script prints only fixed probe names, HTTP status, sanitized error codes and a bounded summary, never row values or credentials. HTTP 200 (including `[]`) is readable; 401/403 or SQLSTATE 42501 is denied; configuration/network failures stop the run immediately. Application emails are public by design. List and similar jobs share the search RPC; the probes exercise their filters plus detail and expired detail, long/special input and pagination abuse. The PostgREST project maximum is expected to be at most 1,000 rows; no row contents are printed.

### Publishing safety net and local migration order
`202611010009_published_required.sql` is generated from `lib/publishing-rules.ts`; Zod uses the same text limits and enums. Regenerate with `npx tsx scripts/generate-publishing-migration.ts` before applying it. Once applied, change rules with a new migration. The SQL check is a database safety net for direct/service-role writes as well as app publishing; custom `APPLY_HOST_BLOCKLIST` entries are additionally enforced by the app. Invalid existing published rows become `unpublished`, retaining all their content for admin review. The rollback removes the constraint/function but deliberately does not republish those rows.

Do not rename previously applied files to manufacture sequential version numbers. The actual ordered migration history is:
1. `202610300001_initial`
2. `202610300002_categories_experience`
3. `202611010001_application_email`
4. `202611010003_job_country`
5. `202611010004_public_job_privacy`
6. `202611010005_click_rpc_access`
7. `202611010006_poster_job_privacy`
8. `202611010007_tombstone_privacy`
9. `202611010008_public_search_boundary`
10. `202611010009_published_required`

There is no `202611010002`; the first two migrations precede the November sequence. This is ten files ending at 009, rather than nine files numbered 001..009. On an isolated local Supabase stack, `supabase start` then `supabase db reset --local` verifies the full chain. Never substitute `--linked` for this test.

### Closing dates and expired/deleted pages
An empty closing date is saved as today's India calendar date plus `JOB_DEFAULT_VALID_DAYS` (default 30). Set `JOB_DEFAULT_VALID_DAYS=0` to disable the fallback; only then does an undated detail show “No closing date”. The form displays the fallback and lets posters/admins select another date. Past dates trigger a visible warning and remain saveable. Admin approval also supplies a fallback for undated older submissions. Expired badges and the Expired filter apply to both admin and poster dashboards independently of moderation status.

An expired published job's slug returns **HTTP 200**, with a friendly notice, current similar jobs, `noindex`, no active Apply control and no JobPosting JSON-LD. Keeping the page readable preserves useful context for old links. Current listing/search/sitemap/feed/API queries exclude it. A known deletion of a previously public job returns **410** through the tombstone proxy; an unknown slug returns **404**. Demo mode includes the fictional `deleted-sample-job` tombstone so the HTTP contract is testable without a remote project.
