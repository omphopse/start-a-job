# v0.1.2 validation

Production was not queried or modified during this task. All application checks used local demo mode, empty public Supabase configuration, and an empty service-role key. No key values were printed or committed.

- `npm run lint`: pass (final run after removing temporary test configuration).
- `npm run typecheck`: pass.
- `npm run test:unit`: 33 passed. Database tests apply all forward migrations, enumerate actual columns, verify denied anon reads, safe search results, draft/expired exclusion, and rollback/reapplication.
- `npm run build`: attempted; Turbopack failed to launch a CSS subprocess (see anon-build.txt). `npm run build -- --webpack` passed when run outside the filesystem sandbox (anon-build-webpack-retry.txt). No permanent bundler change was made.
- `npm run test:ui`: attempted; default Turbopack dev server stalled before tests. Retried with a temporary configuration importing playwright.config.ts and replacing only webServer.command with `npm run dev -- --webpack --port 3100`. The full 99-test run covered mobile 390x844, tablet 768x1024, and desktop 1440x900: 93 passed, six failed during timeout/navigation contention (anon-playwright-webpack-retry.txt). `npx playwright test --config playwright.webpack.config.ts --last-failed --workers=1` passed all six (anon-playwright-rerun.txt). The temporary config was removed. All 99 cases passed across the full run plus rerun; the initial run was not clean.
- `npm run seo:check` with SEO_BASE_URL=http://localhost:3200: pass against the locally served Webpack production build (anon-seo.txt). Verifies five job pages without JavaScript, structured data, bots, sitemap hierarchy/URLs, and public API schema.
- PowerShell AST parse of scripts/verify-live-anon.ps1: pass. The live verification script was deliberately not executed against production.
- `git diff --check`: pass.

Live history remains unverified: the request contained `[PASTE RESULT]`, and no migration-history rows were supplied. See docs/public-column-audit-v0.1.2.md for per-column file/line findings, read-only SQL, the repository migration inventory, conditional exact repair commands, deployment sequencing, and rollback. Do not mark migrations applied from the REST column report alone.
