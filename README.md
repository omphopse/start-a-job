# DeskJobs — Phase 1

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
- Apply links are real HTTPS anchors in initial HTML. JavaScript supplies a countdown, click prevention during the wait, and anonymous click logging. Without JavaScript the original link works immediately.
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

