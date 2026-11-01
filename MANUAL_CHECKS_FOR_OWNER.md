# Manual checks before public launch

The audit is **NO-GO** until the applicable launch blockers below are verified. Local demo/PGlite tests do not prove production Auth, PostgREST, CDN or dashboard configuration.

## Database and migrations

- [ ] Back up the intended Supabase project and test the restore procedure.
- [ ] Confirm the app and SQL Editor refer to the same project. Never run a migration against a different project's schema.
- [ ] Apply every migration in `supabase/migrations` in filename order, including the new public-job privacy, click-RPC access, poster privacy and tombstone privacy migrations (004–007). Apply them as a coordinated deployment with the new server code; the old click endpoint loses permission after the RPC migration.
- [ ] Migration 007 retains old deletion records with `was_public=false` and hides them by default. Restore public visibility only for legacy slugs independently verified as previously published. Never mark every old record public. New deletions of previously published jobs retain HTTP410 behavior; unclassified old records resolve as missing until reviewed.
- [ ] Inspect every deployed public table for RLS; compare schema drift with the repository. Inspect any extra views for `security_invoker` and definer functions for fixed `search_path` and minimal EXECUTE grants.
- [ ] In disposable staging, run the real anonymous/poster/admin/inactive JWT matrix. Anonymous explicit public job queries should succeed; selecting creator IDs/review notes must fail. Another poster must not read/edit internal job rows; own drafts remain editable; published jobs cannot be edited by posters; admin workflows remain usable.
- [ ] Prove a deactivated poster cannot read private jobs or write using an already-issued session/JWT. Prove reactivation restores intended access.
- [ ] Verify direct anon/authenticated `log_apply_click` RPC calls are denied, the server endpoint records only job ID/time, repeated HTTP requests hit the durable rate limiter, and the host overwrites trusted client-IP headers.
- [ ] Verify reports are stored once, visible only to admins, and cannot expose submitted text or profile emails through public APIs.
- [ ] Install Supabase CLI in an isolated environment; run a fresh local database reset, seed fictional data, create the admin, repeat admin creation and confirm no duplicate account/profile. The current script safely refuses when an admin already exists rather than returning idempotent success.
- [ ] Verify real create → submit → approve/reject → resubmit → unpublish/delete flows and cache/sitemap changes.

## Authentication

- [ ] Enable email OTP, configure exactly six digits and an appropriate expiry.
- [ ] Change the email template to display the code rather than requiring a magic link; disable public signups/invite-only access and verify `shouldCreateUser: false` end-to-end.
- [ ] Configure custom SMTP, SPF/DKIM/DMARC and delivery monitoring. Test spam-folder and retry behavior without publishing credentials.
- [ ] Set provider rate limits; test known/unknown email responses and timing, resend limits, brute-force attempts and expired codes.
- [ ] Inspect production cookies for HttpOnly, Secure and SameSite=Lax; confirm tokens do not appear in browser storage or URLs and logout clears the server session.
- [ ] Call every protected page/action with no session, a poster session and an inactive session. Do not rely solely on the proxy/middleware.

## Hosting and browser protections

- [ ] Verify Netlify builds with Node 24, the OpenNext adapter and all required server functions; check only documented environment variables are needed.
- [ ] Keep the service role, cron token and indexing service account server-only. Check public/static bundles again after deployment.
- [ ] Verify domain DNS, HTTPS certificate/redirects and security headers on real responses, not just localhost. Check that a CSP change does not break OTP, navigation, reports, timers, or location loading.
- [ ] When actual AdSense is introduced, follow Google's supported strict-CSP/nonce guidance and test consent/cookies, loading, CLS and placement. The current AdSlot is a placeholder, not a verified ad integration. [Google AdSense CSP guidance](https://support.google.com/adsense/answer/16283098?hl=en-GB).
- [ ] Verify CountriesNow outbound HTTPS works and selection/retry behavior remains usable during outages.
- [ ] Schedule authenticated expiry processing; test publish/unpublish/delete/expiry invalidation on the actual CDN.
- [ ] Remove demo/sample content for launch, set `DEMO_MODE=false` and check the intended apply delay is 10 seconds.
- [ ] Recheck mobile sticky controls, zoom, screen-reader announcements and real devices. Automated axe checks are not a full accessibility audit.

## Discovery, operations and supply chain

- [ ] Netlify/Cloudflare WAF rules must not block Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User or PerplexityBot. Test actual public URLs without login/CAPTCHA.
- [ ] Verify Search Console/Bing ownership, sitemap submission, JobPosting validation, IndexNow key and Google Indexing API service account/notifications.
- [ ] Enable GitHub secret scanning and Dependabot; run gitleaks/trufflehog against all history in CI. Review the reported dev-tool advisories without forcing incompatible downgrades.
- [ ] Have a leaked-key procedure: revoke/rotate the key, update all server deployments, rebuild, invalidate affected sessions where appropriate, investigate access logs, remove exposed artifacts, and rescan history/bundles. Deleting a leaked file alone does not revoke the key.
- [ ] Set log retention/redaction, request-limit cleanup, backups, uptime/error/abuse alerts, incident contacts and a rollback procedure.
- [ ] Collect field Core Web Vitals/INP and validate real production performance; local Lighthouse scores are not field evidence.
- [ ] Resolve checklist drift about the disabled AI placeholder and any thin-page/pagination/real-ad requirements still marked PARTIAL in AUDIT_REPORT.md.

No audit can guarantee the absence of all vulnerabilities. Keep the final NO-GO conditions and unresolved findings visible until individually verified.
