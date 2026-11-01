import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const read = (name) => JSON.parse(readFileSync(`verification/audit/${name}`, 'utf8'));
const reportPath = 'AUDIT_REPORT.md';
let report = readFileSync(reportPath, 'utf8').split('\n## Final independent verdict')[0];
const clean = read('final-clean-summary.json');
const browser = read('browser-phase-final.json');
const lighthouse = read('lighthouse-final-scores.json');
const production = read('production-probe.json');
const audit = read('npm-audit-all-final.json');
const liveJobs = read('live-anon-phase-final.json').find((item) => item.table === 'jobs' && !item.filter);
const liveExposure = liveJobs?.status === 200 && liveJobs.columns.some((column) => ['created_by','approved_by','rejection_reason'].includes(column));
assert.equal(clean.initialStatus.length, 0);
assert.equal(clean.results.length, 6);
assert.ok(clean.results.every((gate) => gate.exit === 0));
assert.equal(browser.pages.length, 65);
assert.equal(browser.pages.filter((item) => item.overflow).length, 0);
assert.ok(browser.accessibility.every((item) => item.violations.length === 0));
assert.equal(production.timer.email10seconds, true);
assert.equal(production.timer.website10seconds, true);
const unitCount = readFileSync('verification/audit/final-clean-unit.txt','utf8').match(/tests\s+(\d+)/)?.[1];
const browserCount = readFileSync('verification/audit/final-clean-playwright.txt','utf8').match(/(\d+) passed \(/)?.[1];
assert.ok(unitCount && browserCount);
const overrides = [
  [/Clean git/, 'PASS', 'Fresh clone starts clean; all final-clean-summary.json gates exit0. Main source fixes are isolated commits; generated evidence is committed separately.'],
  [/Documented env/, 'PASS', 'static-phase-final.json: all deployed/tool variables documented, no unused fields; NODE_ENV is framework-managed.'],
  [/Netlify build/, 'PARTIAL', 'Python tomllib parsed netlify.toml; clean build passes; actual OpenNext/Netlify deployment not run.'],
  [/Countdown default/, 'PASS', 'production-probe.json tests disabled at 9s/enabled at 10s for both methods using the production build; UI suite tests configured 2s. The explicit 10-second user request overrides the generic template default of 12.'],
  [/Search \/ URL filters/, 'PARTIAL', 'portal.spec.ts and api.spec.ts verify URL filters, sorting and distinct 5-item API pages; filter-boundaries.test.ts verifies page 10000 and PostgREST 416 recovery. Default listing size is 20 in lib/data.ts; the 10-job fixture cannot prove a real second 20-item listing page.'],
  [/Sticky mobile/, 'PASS', 'accessibility.spec.ts proves shared timer and final footer clearance at360/390. Real-device safe-area/zoom remains manual.'],
  [/Anonymous click recording/, 'PARTIAL', 'Local role grants and HTTP origin/limiter boundary fixed; website and email UI wiring tested. Real persistence/direct JWT mutation tests remain manual.'],
  [/Public data excludes/, liveExposure ? 'FAIL' : 'PARTIAL', liveExposure ? 'Local privacy regressions pass, but live-anon-phase-final.json still exposes internal job columns. Apply migrations004–007 and retest.' : 'Latest direct anonymous query did not expose internal columns; complete real authenticated/RPC/action matrix remains unverified.'],
  [/Disabled AI placeholder/, 'PASS', 'dashboard.spec.ts verifies disabled AI summary coming-soon control; legacy control absence assertion retained.'],
  [/Screenshots at five/, 'PASS', '25 final production screenshots at360/390/768/1024/1440 plus contact sheets inspected; phase-a originals preserved separately. Dashboard is a demo preview.'],
  [/No horizontal overflow/, 'PASS', 'browser-phase-final.json: 65 route/width checks, zero overflow; long job text and compact-brand regressions added in accessibility.spec.ts.'],
  [/Target size/, 'PASS', 'accessibility.spec.ts verifies real controls >=44px. Geometry scanner flags only the intentionally offscreen aria-hidden report honeypot; see report-form.tsx and globals.css .honeypot.'],
  [/Accessibility axe/, 'PASS', 'Final production axe: zero selected WCAG A/AA violations on home/jobs/detail/login; all3 viewport projects include axe regression. Not a complete screen-reader audit.'],
  [/Mobile Lighthouse/, 'PARTIAL', 'Final clean production scores below; field INP/CrUX and actual deployed domain remain NOT VERIFIED.'],
  [/Secret hygiene/, 'PARTIAL', 'All-history/working-tree regex scan no matching exposed secret; ignore patterns regression passes. Dedicated scanner and provider secret-scanning settings not verified.'],
  [/Client bundle/, 'PASS', 'static-phase-final.json: production chunks scanned for exact local service key/name and secret patterns; no match. Encoded/novel leaks not ruled out.'],
  [/Real anonymous DB negative/, 'PARTIAL', 'Real read-only requests for all hidden statuses/expiry return0; no real write attempts or authenticated JWT matrix.'],
  [/Security response headers/, 'PARTIAL', 'production-probe.json confirms baseline CSP/HSTS/nosniff/referrer/permissions/frame headers. Real HTTPS host and strict script/ad policy remain manual.'],
  [/Installed versions/, 'PARTIAL', 'Final online production npm audit0; full audit20 moderate dev-tool package entries from2 advisory families. No blind force downgrades.'],
  [/≥20 malicious URL/, 'PASS', 'application-url-edge.test.ts and input-probe-after.txt:26 rejected cases,3 valid cases, no validation exceptions.'],
  [/XSS \/ JSON/, 'PARTIAL', 'input-probe-after.txt covers10 rendered/schema text fields and script escaping. Complete persisted/live field/browser matrix is not verified.'],
  [/CSRF\/origin/, 'PARTIAL', 'security.spec.ts rejects cross-origin clicks; server actions use framework checks. Reverse-proxy identity headers and live origin behavior unverified.'],
];
const sourceMatrix = report.split('## Requirements traceability')[1].split('## Security findings')[0];
const rows = sourceMatrix.split('\n').filter((line) => line.startsWith('| ') && !line.startsWith('| Requirement') && !line.startsWith('| ---')).map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()));
let final = `\n## Final independent verdict\n\n**NO-GO for public launch.** Local source fixes are verified, but the configured real database still exposes internal published-job columns, and the live Auth/JWT/hosting matrix is incomplete. Apply migrations004–007, review legacy tombstones, deploy matching code, and complete MANUAL_CHECKS_FOR_OWNER.md before reconsidering GO. No production migration or deployment was performed.\n\n### Final reproducibility results\n\nVerified clean source revision: \`${clean.revision}\`. The final report/evidence commit changes only documentation, audit harnesses and generated artifacts after this source verification. No real service credentials were copied to the clone; all configuration came from .env.example with fixture site URL overridden to localhost3400.\n\n| Command | Exit | Seconds | Evidence |\n| --- | ---: | ---: | --- |\n`;
for (const gate of clean.results) final += `| ${gate.command} | ${gate.exit} | ${gate.seconds} | final-clean-${gate.name}.txt |\n`;
final += `\nProduction \`npm run start -- --port3400\` became ready; production-probe.json and seo-final.txt verify response headers, exact10-second delays,5 no-JS job pages, sitemap hierarchy, named bots and discovery JSON schema. Production location proxy returned ${production.locationAPI.map((entry) => `${entry.options} options (${entry.status})`).join(', ')} for countries/India states/Maharashtra cities. Provider data completeness is not certified.\n\n`;
final += '### Final matrix — every original item\n\nThe Phase A table supplies the original command/test/file evidence. Unchanged PARTIAL items remain limited exactly as described there and in the owner checklist; no local test substitutes for missing production evidence.\n\n| Item | Before | After | Evidence / remaining limit |\n| --- | --- | --- | --- |\n';
for (const [item, before] of rows) {
  const override = overrides.find(([pattern]) => pattern.test(item));
  const after = override ? override[1] : before.includes('PARTIAL') ? 'PARTIAL' : before.startsWith('PASS') ? 'PASS' : before.startsWith('FAIL') ? 'FAIL' : before.startsWith('NOT VERIFIED') ? 'NOT VERIFIED' : 'PARTIAL';
  const evidence = override ? override[2] : 'Same bounded Phase A evidence; final clean-clone command results above re-verify local behavior. External or missing edge-case evidence remains unverified.';
  final += `| ${item} | ${before} | ${after} | ${evidence} |\n`;
}
final += '\n### Final production Lighthouse and axe\n\n| Page | Performance | SEO | Accessibility | Best Practices | LCP ms | CLS | TBT ms |\n| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |\n';
for (const item of lighthouse) {
  const full = read(`lighthouse-final-${item.page}.json`);
  const tbt = full.audits['total-blocking-time'].numericValue;
  final += `| ${item.page} | ${item.performance} | ${item.seo} | ${item.accessibility} | ${item['best-practices']} | ${item.LCP.toFixed(2)} | ${item.CLS} | ${tbt.toFixed(2)} |\n`;
}
final += `\nFinal production axe: ${browser.accessibility.map((item) => `${item.name}=${item.violations.length}`).join(', ')} violations in selected WCAG A/AA tags. Layout checks: ${browser.pages.length} combinations, ${browser.pages.filter((item) => item.overflow).length} horizontal overflows. Full JSON/HTML Lighthouse reports and axe node details are preserved in verification/audit. Lab TBT is not field INP; real p75 Core Web Vitals remain NOT VERIFIED.\n\nVisual review includes all25 final pages in contact sheets and full-size detail inspection. The original360px wrapped brand and valid120-character title overflow were caught after initial automated passes and corrected with regressions; screenshots were refreshed after the fixes. Secondary metadata still uses small fonts, so real-device/zoom legibility remains a manual check. No primary action clipping or permanent sticky-footer overlap found in fixtures. The sole small-target geometry exception is the offscreen report honeypot (left:-10000px, aria-hidden, tabIndex:-1), not an exposed clickable control.\n\n`;
final += '### Remaining dependency advisories\n\nProduction audit:0 known advisories. Full audit:20 moderate dev-tool package entries; the two advisory families are glob cancellation traversal and minimatch amplification. No production dependency path is reported, but CI/build work over untrusted filenames can still be exposed. Upgrade supported tooling after compatibility testing; npm audit force suggestions include incompatible downgrades and were not applied.\n\n| Package | Severity | Reachability |\n| --- | --- | --- |\n';
for (const item of Object.values(audit.vulnerabilities)) final += `| ${item.name} | ${item.severity} | Dev/build/CI dependency chain; no production dependency path reported |\n`;
final += '\n### Residual risk and owner action\n\n- Known configured-database column exposure remains until migration004 and matching deployment; other new grants/policies and tombstone protections also require migrations005–007 and real retesting. Legacy deleted records are preserved but hidden unless independently classified as public.\n- NOT VERIFIED: disposable local Supabase reset, real Auth delivery/expiry/SMTP, known-vs-unknown timing, real admin/poster/inactive JWT writes, complete role/action lifecycle, create-admin/seed against Auth, session logout/cookies, production edge IP/origin trust, and deployed schema drift/views/functions.\n- NOT VERIFIED: real Netlify/OpenNext deployment, TLS/DNS/CDN invalidation and expiry scheduler, bot/WAF access, search-engine credentials, actual ads/consent/strict CSP, field INP/CWV, all browser engines/devices/zoom, exhaustive persisted XSS/error/log injection.\n- Dedicated gitleaks/trufflehog, hosted secret scanning/Dependabot, backups/restoration and monitoring/alerts remain owner checks. Regex scanning does not prove that every possible secret was absent.\n- The observed four-worker Next development-server JSON failure was preserved; the unchanged two-worker rerun and final sequential clean clone passed. No tests were deleted/skipped to hide it.\n- Follow MANUAL_CHECKS_FOR_OWNER.md. An audit cannot guarantee absence of all vulnerabilities. This is an audited source candidate, not launch approval.\n\n### Primary advisory/platform references\n\n- [Next.js October2026 security update](https://nextjs.org/blog/nextjs-security-update-october-14-2026): fixed active-LTS threshold16.4.1; installed16.4.3 is above it. Final npm audit remains the broader installed-tree check.\n- [Netlify Next.js/OpenNext support](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/): auto adapter support; actual deployment was not executed.\n- [AdSense supported CSP integration](https://support.google.com/adsense/answer/16283098?hl=en-GB): strict nonce integration requires separate deployment/ad testing; baseline policy is not claimed as strict XSS containment.\n- [Glob advisory](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) and [minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249): final dev-tool findings retained.\n\n**NO-GO — GO requires applying and verifying the privacy/access migrations on the intended database, deploying the matching source, and completing the real-session/hosting launch checks without unresolved critical/high findings.**\n';
final = final.replace('--port3400','--port 3400').replaceAll('localhost3400','localhost:3400').replaceAll('exact10-second','exact 10-second').replaceAll('all25','all 25').replaceAll('original360px','original 360px').replaceAll('valid120-character','valid 120-character').replaceAll('October2026','October 2026').replaceAll('threshold16.4.1','threshold 16.4.1').replaceAll('installed16.4.3','installed 16.4.3');
if (!liveExposure) final = final.replace('the configured real database still exposes internal published-job columns, and ', '').replace('Known configured-database column exposure remains until migration004 and matching deployment;', 'Source privacy fixes require verified deployment and retesting;');
for (const [before, after] of [
  ['migrations004', 'migrations 004'], ['migrations005', 'migrations 005'], ['migration004', 'migration 004'],
  ['exit0', 'exit 0'], ['at360', 'at 360'], ['all3', 'all 3'], ['covers10', 'covers 10'],
  ['reports. Production', 'reports. Production'], ['audit:0', 'audit: 0'], ['audit:20', 'audit: 20'],
  ['audit0', 'audit 0'], ['audit20', 'audit 20'], ['from2', 'from 2'], [';5 no-JS', '; 5 no-JS'],
  ['delays,5', 'delays, 5'], ['.txt:26', '.txt: 26'], ['cases,3', 'cases, 3'],
]) final = final.replaceAll(before, after);
final += `\nFinal clean-clone counts: **${unitCount} unit tests; ${browserCount} browser tests; all passed.**\n`;
writeFileSync(reportPath, report + final);
console.log(`Wrote complete before/after matrix for ${rows.length} original items.`);
