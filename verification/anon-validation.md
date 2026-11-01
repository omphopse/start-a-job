# v0.1.2 validation

Production and staging were not queried or modified during this task. Application checks used local demo mode, empty public Supabase configuration, and an empty service-role key. No key values were printed or committed. The operator supplied the 26-column staging grant list; migration-history rows were not supplied.

Final follow-up release checks:

- `npm run lint`: pass, no warnings.
- `npm run typecheck`: pass.
- `npm run test:unit`: 33 passed (anon-unit.txt). Tests enumerate all actual jobs columns, deny every field outside the 22-column allow-list (including created_at, updated_at, status and search_document), check safe search/detail/expired RPC outputs, draft/expired exclusion, rollback/reapplication, and two consecutive applications of 008. The real SDK pagination probe rejects filters, ordering, or projections involving revoked columns, and checks exact counts on the listing RPC.
- `npm run build -- --webpack`: pass (anon-build-webpack-retry.txt). Built the latest source with PLAYWRIGHT_TEST=true, DEMO_MODE=true, NEXT_PUBLIC_SITE_NAME=startajob, NEXT_PUBLIC_APPLY_DELAY_SECONDS=2 and empty Supabase settings. PLAYWRIGHT_TEST selects .next-test as distDir. Default Turbopack previously failed to launch its CSS subprocess (anon-build.txt); no permanent bundler setting was changed.
- Full Playwright suite: **99 passed in one clean run**, mobile 390x844, tablet 768x1024, desktop 1440x900 (anon-playwright-final.txt). Command: `npx playwright test --config playwright.production.config.ts --workers=2`. The temporary config imported playwright.config.ts, preserved its three projects and credential-free demo environment, and replaced only webServer.command with `npm run start -- --port 3100`. It was removed after testing. Earlier dev-server runs and their six successful retries are archived in anon-playwright-webpack-retry.txt and anon-playwright-rerun.txt; those precede the final follow-up code.
- `npm run seo:check` with SEO_BASE_URL=http://localhost:3200: pass against the rebuilt local production server using the same demo environment (anon-seo.txt). Verifies five no-JS job pages, JSON-LD, bot directives, sitemap hierarchy/URLs, and public API schema.
- PowerShell AST parse of scripts/verify-live-anon.ps1: pass. The live verification script was deliberately not executed against production/staging. It now treats created_at, updated_at and status as internal alongside the vector and moderation fields.
- `git diff --check`: pass.

See docs/public-column-audit-v0.1.2.md for five-column file/line findings, supplied grant evidence, read-only history SQL, the repository migration inventory, conditional exact repair commands, maintenance-window deployment order, and rollback. Live recorded-versus-manual history cannot be inferred from the column grant report.
