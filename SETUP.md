# Launch checklist

Complete each numbered step in order. Keep all keys out of Git and screenshots.

## Local tools and Supabase

1. Install Node.js 24 LTS and Git. Open this project folder in a terminal, run `npm ci`, and copy `.env.example` to `.env.local`. Run `npm run dev` and open http://localhost:3000 for the sample preview.
2. Create a Supabase account and a new project. Choose a suitable India/nearby region, choose a strong database password, and store it in a password manager. Wait for provisioning.
3. In the Supabase SQL editor, paste and run `supabase/migrations/202610300001_initial.sql` once. Future migration files must run in filename order. Check that all tables have RLS enabled. This migration adds profiles, jobs, reports, click records, editable landing pages, deleted-job tombstones and durable rate-limit records.
4. In the project's API settings, copy the project URL and anonymous/public API key into `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Put the legacy service-role key into `SUPABASE_SERVICE_ROLE_KEY`. It must remain server-side. Never add the `NEXT_PUBLIC_` prefix to a secret.
5. Set `NEXT_PUBLIC_SITE_URL` to your eventual HTTPS domain, without a trailing slash; keep localhost during local work. Set `NEXT_PUBLIC_SITE_NAME`, `CONTACT_EMAIL` to your real support address, and `NEXT_PUBLIC_APPLY_DELAY_SECONDS=10`. Set `DEMO_MODE=false` before going live. Leave AdSense and indexing credentials blank until their steps below.

## Email OTP and team accounts

6. In Supabase Auth, enable the Email provider. Disable public new-user signups. Configure the Site URL and allowed redirect URLs for localhost, the deployment preview/staging host and the final HTTPS domain. The app uses codes, not a callback or magic-link route.
7. Edit the email sign-in/Magic Link template so its body displays the six-digit `{{ .Token }}` value. Remove the magic-link button/ConfirmationURL. Use wording such as “Your <site.name> sign-in code is {{ .Token }}” (use the current configured name; `npx tsx scripts/email-template.ts` generates the body). Configure the email OTP length to six digits if the dashboard exposes it; choose an expiry appropriate to your users. Test the received email contains a code and no required sign-in link. See [Supabase email OTP documentation](https://supabase.com/docs/guides/auth/auth-email-passwordless).
8. Configure custom SMTP under Auth email settings. Supabase's built-in delivery has very low sending limits and is unsuitable for production. Resend or Brevo may offer a free tier; check their current allowances. Verify your sending domain, add the provider's SPF/DKIM DNS records (and DMARC as appropriate), then copy SMTP host, port, username, password and sender address into Supabase. Keep SMTP credentials in Supabase, not in this repo. Send a test email and check spam placement.
9. Restart the local server after environment changes. Run `npm run create-admin -- you@example.com` with your real address. This creates the first Auth user and active admin profile without sending an invitation. The script refuses to create another initial admin if one exists. Open `/admin/login`, request a code, copy it from your email, and sign in.
10. Open `/admin/users`, enter a poster name and email, and create the account. Ask that person to request their own code. Test creating a draft, submitting it, rejecting with a reason, editing/resubmitting, and approving it. Confirm the poster cannot publish and cannot edit a published job. Deactivate the poster and verify old sessions lose protected access; reactivate when appropriate.
11. Use a separate staging Supabase project for samples. `npm run seed` creates ten fictional jobs under the first admin. They all use example.com. Delete every sample before production. Write original, accurate summaries from official recruitment sources, verify eligibility and the deadline, and confirm no fees are requested. Configure `APPLY_HOST_BLOCKLIST` with additional comma-separated hosts when needed.
12. Review and customize About, Contact, Privacy and Disclaimer content in `app/[info]/page.tsx`. Identify the actual site operator, set a reachable support email, publish a retention schedule, and document any future third-party processing. The supplied prose is starter content, not a substitute for your own policy review.

## Push to GitHub

13. Create an **empty private** repository on GitHub. Do not initialize it with a README or .gitignore. Git already exists locally on `main`; inspect `git log --oneline` and `git status` first. The build used your existing Git identity. Change future commit identity if needed with `git config user.name "Your Name"` and `git config user.email "your-address"`.
14. Copy the new repository's HTTPS URL and run the following, replacing the placeholder. The build has not pushed anything.

    ```powershell
    git remote add origin <url>
    git push -u origin main --tags
    ```

15. Enable branch protection and require the CI workflow before merging future changes. GitHub Actions installs dependencies, Chromium, and runs lint, types, unit/database tests, production build and the three Playwright projects. Keep `.env.local`, private keys and service-account JSON untracked. Public environment values are baked into the client build, so rebuild after changing them.

## Deploy on Netlify

16. In Netlify choose Add new project → Import an existing project → GitHub, authorize access only to this repo, and select `main`. Use build command `npm run build` and publish directory `.next`; `netlify.toml` supplies these and Node 24. Use Netlify's current Next.js framework integration. Do not use static export: this app requires server actions, SSR and route handlers. See [Netlify Next.js support](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/).
17. Add the environment variables from `.env.example` in Netlify's environment settings, using your production Supabase project and final site URL. Make server secrets available only to server/build contexts where supported; never expose them with a public prefix. Set `DEMO_MODE=false`. Separate deploy-preview keys/projects from production to prevent accidental test writes.
18. Deploy and inspect build/function logs. Test `/`, `/jobs`, one job, `/admin/login`, OTP delivery, create/edit/reject/approve, user deactivation, reports, API, RSS, sitemap, robots and expired detail pages on the deployed host. Verify that the service key is absent from browser bundles/network responses. Publish a real staging job, check the apply countdown and new-tab link, and confirm the click/report rows in Supabase. A live signed-in workflow could not be exercised during the local build because no project credentials were supplied.
19. Connect the domain in Netlify Domain management. Follow the displayed registrar DNS records, set the primary domain, wait for DNS, enable/verify HTTPS, and redirect alternate www/apex hosts to the primary host. Update Supabase Auth URLs and `NEXT_PUBLIC_SITE_URL` to match, then redeploy. Confirm canonical links and sitemap contain only the primary HTTPS hostname.
20. Each push to `main` will trigger Netlify automatic deployment. If choosing Cloudflare instead, import/connect the GitHub repo through the current supported **OpenNext Next.js Workers** workflow, configure equivalent variables/secrets, and validate server actions, cookie refresh, Node crypto and `after()` support. This repo is not a static Cloudflare Pages export and does not include a verified Cloudflare adapter configuration. Follow the [current Cloudflare Next.js guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/) before using that alternative.
21. Set a long random `CRON_SECRET` in the host. Configure a trusted external scheduler to POST to `https://your-domain/api/internal/expire` at **00:05 Asia/Kolkata daily**, with `Authorization: Bearer <CRON_SECRET>`. The endpoint refreshes pages/sitemaps and optionally notifies search providers for yesterday's expired jobs. Public data already hides expired jobs on every request, even if the scheduler fails. Monitor scheduler failures; notification outages must not block publishing.

## SEO and AI visibility launch checklist

22. Create a Google Search Console domain property and verify the DNS TXT record. Submit `https://your-domain/sitemap.xml`; it points to jobs, category/location and static sitemaps. Use URL Inspection → Test live URL on three real published jobs. Inspect the initial HTML, canonical, title, dates, visible content and source link. Use [Google Rich Results Test](https://search.google.com/test/rich-results) for JobPosting and breadcrumbs. Fix all errors; review warnings against the real source. Do not submit sample vacancies or mark salary ranges you cannot verify.
23. To enable the Google Indexing API, create a Google Cloud project, enable the Indexing API, create a service account, generate a JSON key and grant its email owner access to the Search Console property. Store the JSON as `GOOGLE_INDEXING_SA_JSON` in host secrets, never in Git. Request appropriate quota/approval as needed. Redeploy, publish a real job and inspect notification logs. The integration sends URL_UPDATED and URL_DELETED for job pages; it does not guarantee indexing. Follow [Google's setup guide](https://developers.google.com/search/apis/indexing-api/v3/prereqs) and [supported notification usage](https://developers.google.com/search/apis/indexing-api/v3/using-api).
24. Open Bing Webmaster Tools and import your verified Search Console property. Generate an IndexNow key and set `INDEXNOW_KEY`. Redeploy and confirm `/indexnow-key.txt` returns that exact public key. The notification specifies this file as `keyLocation`, so no extra key file is needed. Publish/edit/delete a test job and inspect logs. See [IndexNow documentation](https://www.indexnow.org/documentation).
25. Check `/robots.txt`. OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User, PerplexityBot, Googlebot and Bingbot are explicitly allowed, with private routes restricted. Set `ALLOW_AI_TRAINING_BOTS=false` if you wish to disallow GPTBot, ClaudeBot, Google-Extended, CCBot and Applebot-Extended. This flag does not disable search/citation bots. Heavily parameterized job searches are restricted conservatively by robots and use noindex/canonical rules.
26. In Netlify/Cloudflare bot protection and firewall settings, verify Googlebot, Bingbot, OAI-SearchBot, Claude-SearchBot and PerplexityBot can fetch public job HTML, JSON, feeds and sitemaps without login, CAPTCHA or JavaScript challenges. Use verified-bot controls where available; do not broadly trust a user-agent string. Inspect host request/access logs or log drains for bot user agents, requested URLs, response status, latency and challenge decisions. Compare with Search Console/Bing crawl reports. Configure log retention and avoid logging sensitive report bodies or auth tokens.
27. Run `npm run seo:check` against staging/production with at least five real current jobs. To target the host in PowerShell, set `$env:SEO_BASE_URL='https://your-domain'`, then run the command. It fetches without JS, checks five job pages, required structured fields, official anchors, named bot rules, public API schema, and every sitemap URL. Check `/feed.xml`, `/openapi.json` and `/llms.txt` manually. llms.txt is informational and is not a ranking mechanism.
28. Run `npm run lighthouse` against a production server and inspect `verification/lighthouse-*.html`. Repeat after enabling ads, consent tooling or analytics. The countdown is a transparent reading aid, not a reason to click ads. Monitor real Core Web Vitals after launch: LCP below 2.5s, CLS below 0.1 and field INP below 200ms. Lab tests cannot establish field INP.
29. Monthly: review Search Console indexing/JobPosting reports, expired/deleted URLs, sitemap health, crawl errors, bot logs and provider-notification failures. Fix broken official links, thin/duplicate introductions and stale deadlines. Review reports, update original content, check mobile performance and accessibility, patch dependencies and back up the database. Delete stale request-limit records (for example `delete from public.request_limits where reset_at < now() - interval '1 day';`) and apply your chosen retention schedule to clicks/reports. Test poster deactivation and restore procedures periodically.

## Location dropdowns

Apply `supabase/migrations/202611010003_job_country.sql` before deploying the location dropdown changes. It preserves existing city/state values and defaults existing countries to India. Posters can leave city and state blank.

Country, state, and city dropdowns load from CountriesNow through `/api/locations`; no API key is required. The server caches provider responses for 24 hours and times out requests after 15 seconds. Allow outbound HTTPS to `countriesnow.space` from the deployment. The form preserves existing selections when the provider is unavailable and offers Retry controls.

## Optional analytics and advertising

30. Analytics is off. If adding Google Analytics, create a GA4 property and web stream, integrate its tag with a consent-aware component, update the privacy policy and test consent behaviour before collecting data. Do not put personal information, reports or auth emails into events. No analytics package was added automatically.
31. Prepare for AdSense with useful original recruitment summaries, accurate official links, a clear site operator, reachable contact, Privacy/About/Disclaimer pages, accessible navigation and a working domain. Remove sample data and misleading, expired or duplicate content. Google does not publish a universal minimum number of posts or traffic guarantee; apply when the site is genuinely useful and compliant. Follow [AdSense eligibility](https://support.google.com/adsense/answer/9724) and [publisher policies](https://support.google.com/adsense/answer/48182).
32. Apply through AdSense and complete its site-ownership verification. After approval, add the approved unit loader/component and any required consent management. The delivered `AdSlot` is reserved space only and intentionally loads no external ad code. Put the client identifier into `NEXT_PUBLIC_ADSENSE_CLIENT` only when ready. Keep ads outside the apply panel and the editorial buffer; do not enable Auto ads placements that interfere with application controls.
33. Copy the **exact** ads.txt line supplied by AdSense into `ADS_TXT`, for example `google.com, pub-<your-id>, DIRECT, f08c47fec0942fa0` using your real publisher ID. Redeploy and verify `/ads.txt` in the browser. Do not use someone else's ID. Review CLS, performance, consent and ad placement on all screen sizes before enabling monetization.

## Final owner checks

34. Verify the real admin/poster workflow, SMTP, database backups, host logs, expiry scheduler and third-party notifications on staging. Confirm every secret remains server-only and rotate any exposed key immediately. Keep your Supabase and hosting recovery details in a password manager.
35. Save the final local verification report and screenshots as a baseline. Push only when you are ready, then test the deployed host again. Local passing tests cannot verify your domain, provider accounts, DNS, email delivery, AdSense approval or production bot/firewall configuration.

## Upgrade: optional fields, experience levels and categories

For an existing project, run `supabase/migrations/202610300002_categories_experience.sql` once in Supabase SQL Editor. Do not rerun the initial migration. For a new project, run all migration files in filename order. This migration adds the category catalog, admin-only category creation, category references and expanded experience levels without deleting jobs.

Admins can open **Add a new category** above the job form. Added categories are available to posters and public filters. Summary remains required; Eligibility, Documents needed, How to apply, Vacancies and Last date are optional and blank values are hidden on public job pages.

## Application URL or email

Before deploying this feature, apply `supabase/migrations/202611010001_application_email.sql` once in Supabase SQL Editor, after the earlier migrations. This adds nullable `application_email`, permits `apply_url` to be null for email jobs, and requires exactly one application method. Existing URLs and jobs are preserved. Table grants, RLS, publication guards and the expired-job RPC retain their restrictions. This migration was exercised in the local PostgreSQL test database; it has **not** been applied to the live Supabase project by this change.

The single **Application URL or Email** field accepts an official HTTPS URL or one email address. Input is trimmed; email domains are lowercased while local-part spelling/case and plus addressing are preserved. HTTP, unsafe protocols, credentials, ports, shorteners, messaging links, malformed addresses and multiple recipients are rejected. The application method remains required for drafts as well as published jobs, matching the previous form rule. Saving a URL explicitly clears the email; saving an email explicitly clears the URL. Approval repeats validation against the saved fields.

URL applications retain their safe external link and configurable countdown; the default is ten seconds. Existing environment overrides remain effective, so set `NEXT_PUBLIC_APPLY_DELAY_SECONDS=10` on your deployment if an older override is present. Email jobs use the same delay: the address and **Send Application** mailto link appear only when the countdown ends, without prefilled personal data. Both application methods log only the public job ID through the rate-limited server endpoint. Invalid legacy destinations render an unavailable message.

## Audit security migrations

Apply migrations 004–007 in filename order after the country migration and coordinate deployment with the new server code. They restrict anonymous column reads, limit expired detail results to public fields, require the server role for click logging, keep authenticated poster reads within owner/admin policies, and hide deletion records for jobs never known to be public. The old click endpoint will lose RPC access after migration 005, so deploy the matching server implementation together. Migration 007 preserves legacy tombstones but hides unclassified records by default; restore only independently verified previously public slugs, rather than exposing every old deletion. Newly deleted public listings retain HTTP410 behavior.

Read `AUDIT_REPORT.md` and `MANUAL_CHECKS_FOR_OWNER.md` before launch. Source fixes and local tests are not proof that the deployed database, Auth settings, SMTP, HTTPS or CDN are configured correctly. The baseline CSP protects framing, embedded objects, base URLs and form destinations; it is not a strict script/nonced XSS policy. Review Google's strict-CSP guidance before enabling real advertising.

Public fetches now project the application email alongside the URL, with no additional queries. Public JSON keeps `source_apply_url` for URL jobs (null for email jobs) and adds nullable `application_email`; OpenAPI documents both. Public responses remain anonymous, published-only, and free of private moderation fields. Existing save/review invalidation expires the tagged public job cache and affected ISR pages after application-method changes. Deploy after the migration, then verify URL → email → URL editing in a signed-in admin session and the anonymous public page. No live deployment or live signed-in mutation was performed by this change.

Local verification: lint and TypeScript checks pass, along with 21 unit/database tests and four desktop browser tests. The optimized production webpack build and isolated `next start` fixture pass, including URL → email → URL cache invalidation, legacy URL behavior, expiry, public access and protected admin redirects. Twenty warm fixture requests were cache hits with zero backend calls (median TTFB 16.9 ms; p95 24.0 ms). These are local fixture results, not deployed latency measurements. Reproduce with `npx tsx scripts/benchmark-public-jobs.ts application-methods`; results are in `verification/public-performance-application-methods.json`.

Files changed for this feature:

- Admin entry/persistence: `components/job-form.tsx`, `app/admin/jobs/actions.ts`, `lib/validation.ts`, `lib/application-method.ts`.
- Storage/data: `supabase/migrations/202611010001_application_email.sql`, `lib/jobs.ts`, `lib/sample-jobs.ts`, `lib/data.ts`, `lib/public-job-fields.ts`, `lib/public-job-cache.ts`.
- Rendering/review/public API: `components/application-panel.tsx`, `app/jobs/[slug]/page.tsx`, `components/review-queue.tsx`, `lib/public-api.ts`, `app/openapi.json/route.ts`, `scripts/seo-check.ts`.
- Verification: `tests/unit/application-method.test.ts`, `tests/unit/jobs.test.ts`, `tests/unit/rls.test.ts`, `tests/ui/application.spec.ts`, `tests/ui/dashboard.spec.ts`, `scripts/benchmark-public-jobs.ts`, and the application-methods verification artifacts.
- Configuration/documentation: `.env.example` and this file. Existing private environment overrides are preserved.

## Central brand configuration

The current application display name is defined once in `lib/config.ts`. Set `NEXT_PUBLIC_SITE_NAME` to the final approved name when supplied, and rebuild after changing it. Keep `NEXT_PUBLIC_SITE_URL` set to the appropriate environment domain. The Supabase project display name is independent and is not renamed by this application setting.

Update the Supabase Auth email template and SMTP sender display name to match the sign-in wording above. Also review any custom introductions or seeded sample copy already saved in Supabase for outdated product wording; this rebrand does not rewrite stored content. Those external/provider updates and deployment have not been performed or verified here. No database migration is required for the branding change.

## Environment separation and safe migration commands

| Environment | Supabase target | Configuration |
| --- | --- | --- |
| Local verification | Disposable Docker stack only; never linked hosted data | `.env.example`, `SITE_ENV=local` |
| Staging | The separate project used for your manual staging tests | `.env.staging.example`, `SITE_ENV=staging` |
| Production | A different dedicated production project, with its own Auth users, keys and backups | `.env.production.example`, `SITE_ENV=production` |

The actual hosted project refs have not been supplied/verified in this work. Record the staging and production refs in your private deployment inventory and compare them in the Supabase dashboard before every link/push. A Supabase project's display name does not determine its environment or the website brand. Never copy staging credentials into production, or production credentials into local test files. The examples contain placeholders only.

`SITE_ENV=staging` sends `X-Robots-Tag: noindex, nofollow`, noindex metadata and `User-agent: * / Disallow: /` in robots.txt. Production permits normal discovery. In a production build (unless explicitly marked local/staging), the build fails unless `NEXT_PUBLIC_SITE_URL` is an HTTPS site origin, `DEMO_MODE=false`, and the effective apply delay is ten seconds. Keep the production template's `NEXT_PUBLIC_APPLY_DELAY_SECONDS=10`. Changing public variables requires rebuilding. Canonical, OpenGraph, JSON-LD, feed and sitemap URLs derive from the normalized `site.url` config.

A local-only `supabase/config.toml` is included (public signups disabled, six-digit OTP, max 1,000 API rows, no automatic seed). For a **fresh disposable local stack** only:

```powershell
npx.cmd supabase start
npx.cmd supabase db reset --local
```

Reset destroys the selected database's current data. `supabase link --project-ref <STAGING_PROJECT_REF>` changes which remote project subsequent linked commands target. `supabase db push --linked --dry-run` previews migrations for that linked target; `supabase db push --linked` applies them and changes remote schema/data. Verify the project ref and pending migration list before applying. Use a separate checkout/private CLI workdir for production linking and verify its ref independently. **Never run `supabase db reset --linked` or a reset with a production database URL: it drops remote schema/data and replays migrations. Never reset production.** No link, push, reset of a hosted project, deployment or remote data write was performed for this release. See [Supabase's local workflow and linked-reset warning](https://supabase.com/docs/guides/local-development/cli-workflows).

Read the actual immutable migration order in README: two October files, then November 001, 003–009 (ten files; November 002 never existed). Apply 009 before relying on its publishing safety net. It demotes incomplete published records to `unpublished`; review and correct them before republishing. Back up before the owner applies it. The matching rollback removes only the safety net and does not automatically republish invalid content.

## Windows PowerShell script policy

If `npm.ps1` or another downloaded script is blocked, use `npm.cmd` / `npx.cmd` to invoke the Windows command wrappers. For a reviewed local PowerShell script, run it once with `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/verify-live-anon.ps1`, or set `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` in that terminal. The process-scoped setting ends when that terminal closes; do not change machine-wide policy or set global Unrestricted. Set the anonymous verifier's two environment variables privately and check its printed project ref; it never needs a service-role key.

## Dashboard settings that SQL migrations do not copy

Repeat these settings separately in staging and production; migrating tables/functions/policies does not copy provider settings:

- Enable Email OTP and configure **six digits** to match the login form. Set the sign-in/Magic Link email body to display `{{ .Token }}`, without requiring a magic-link button. Generate the brand-aware body with `npx tsx scripts/email-template.ts`, then paste it into that project's template. See [passwordless email](https://supabase.com/docs/guides/auth/auth-email-passwordless), [email template variables](https://supabase.com/docs/guides/auth/auth-email-templates) and [OTP configuration](https://supabase.com/docs/guides/local-development/cli/config).
- Disable public new-user signups. Create the initial admin through `npm run create-admin -- admin@example.com` using the private credentials for the intended project. Confirm its project ref before running; this command creates an Auth user and admin profile. Then sign in with OTP and create posters through `/admin/users`. Do not run this against production during staging tests.
- Configure and test custom SMTP, verified sender domain and sender display name separately in each project. Migrations do not copy SMTP credentials. See [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
- Set Auth **Site URL** to that environment's website and allow only its required redirect URLs. Keep staging hosts out of production's allowlist unless there is an explicit operational reason; local development URLs belong in local/staging settings.
- Enable the appropriate backup/PITR plan, document retention and recovery contacts, and test a restore into a disposable project. Auth configuration, DNS, provider secrets, SMTP delivery and backup restore readiness require manual verification.

## Dev “1 Issue” indicator and verification limits

The installed Next.js guide at `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/devIndicators.md` documents that the indicator is development UI and does not appear in `next build` / `next start`. `devIndicators: false` was already configured; it does not suppress compile/runtime errors. The production-fixture admin redirects, dashboard previews, forms, accessibility checks and build pass. The original authenticated admin's issue text was not supplied and was not reproduced locally; the underlying issue cannot honestly be declared harmless from its count alone. No staging/production session was opened to investigate it. If it remains, capture the issue's expanded text during your next authorized staging check. The separately observed local Turbopack CSS-worker crash is documented in the release report; the dev/build scripts now select the supported `--webpack` option explicitly so ordinary `npm run dev` and `npm run build` use the verified bundler.

If a hosted database was initialized by pasting SQL into the dashboard, reconcile its migration history with the actual schema before using CLI push. Use `supabase migration list --linked` only after verifying the linked ref; do not blindly replay existing migrations or mark an unapplied migration as applied. In particular, never mark 009 applied before running and checking it. The local CLI configuration is not proof of any hosted project's migration history or Auth settings.
