# Public job detail performance

## Verified causes and lifecycle

The public identifier is a **slug**, queried against the existing unique
`jobs.slug` index. It is not the admin UUID.

Previously every `/jobs/[slug]` request performed:

1. A blocking anonymous `deleted_jobs` lookup in the proxy, needed for HTTP 410.
   This branch did **not** perform authentication or refresh sessions. This is
   the database/network wait behind the reported public proxy delay; its SQL
   execution time versus network/gateway time remains unmeasured on the live backend.
2. Static root/admin-independent layout rendering with no layout I/O.
3. The published job lookup for metadata/content. The local baseline observed
   only one active-job HTTP call: Next already deduplicated identical fetches.
   Explicit React memoization now also deduplicates the complete function,
   including the expired-record fallback.
4. A sequential similar-jobs query using `select('*', { count: 'exact' })`, even
   though only four cards and no total count were needed.
5. Rendering on every request because the page used `force-dynamic`.

The local baseline made three backend HTTP calls for every warm detail GET.
There is no public auth/profile/ownership lookup, internal HTTP request,
server-side ad call or indexing notification on this path. ApplyPanel's local
countdown starts after hydration; its analytics POST runs only when Apply is
clicked. It does not explain server request latency. The root layout and AdSlot
perform no external fetches.

No query plan was available from the actual Supabase project. Both slug and
tombstone slug already have unique/primary-key indexes. No speculative index
or database migration was added. HTTP/query elapsed timings include backend,
network and gateway work and must not be presented as pure SQL execution time.

## Changes and cache correctness

- The public page now uses 60-second ISR with an empty `generateStaticParams`
  result, so slugs are rendered on demand. The measured production-mode HTML
  headers are `x-nextjs-cache: HIT` and `Cache-Control: s-maxage=60` for a hit.
- `expireTime: 60` bounds CDN caching; the initial Next default produced a
  nearly one-year `stale-while-revalidate` allowance, which was removed.
- The public published job and similar cards use explicit anonymous-only
  `unstable_cache` data caches, compatible with this project's existing
  non-Cache-Components configuration. Both have a 60-second revalidation
  interval and the `public-jobs` tag. Neither reads cookies, request headers,
  profiles, sessions or service-role credentials. Cache keys include the
  Supabase project URL; job keys include the slug and card keys include the
  category/date. Expired published jobs retain their existing noindex page.
- Job queries project only public fields. Card queries project eleven fields,
  limit to four, and omit the exact count and long descriptions. Drafts,
  unpublishes and private moderation/creator fields never enter the shared job
  data cache. Missing jobs throw an internal sentinel so a null/error is not
  persisted in that data cache. A rendered 404 may be cached by ISR; the
  existing mutation helper invalidates its route when the slug is created or
  republished. Global invalidation also covers detail/404 pages.
- Existing save/review/delete/expiry paths already call `refreshJobs`. It now
  performs blocking `revalidateTag('public-jobs', { expire: 0 })` plus route
  invalidation, including other detail pages whose similar cards depended on
  the changed listing. Mutations must complete this helper before returning.
  No `max` stale-serving tag profile is used for removals.
- Public requests still enter a small proxy branch to preserve deletion HTTP
  status. In the installed runtime, a tested `unstable_cache` wrapper in the
  proxy did not cache its database calls. It was replaced with a **bounded,
  opportunistic per-worker cache** of public booleans: hard ten-second expiry,
  at most 1,024 keys, concurrent-read coalescing, no cached failures. Each cold
  worker still makes a tombstone request. No correctness or authorization
  decision depends on workers sharing memory.
- Deletion content removal is immediate after application invalidation. A
  separate proxy worker may retain a negative tombstone for at most ten
  seconds, during which the page returns **404 without the job content**;
  then the proxy returns **410**. This transition was explicitly tested.
  A same-worker cache clear is attempted eagerly, but is not relied upon.

The public proxy matcher was deliberately retained for the essential HTTP 410
behavior. No auth code was added to it. The admin matcher and all protected
actions, API checks, RLS and validation remain in place.

Time-based Next ISR/data revalidation can serve a previous version while
regenerating, and may retain the last successful result after backend failure.
Application mutations use blocking invalidation to remove that version. Writes
made directly in Supabase must trigger the same application invalidation (or a
secured webhook using it); this project does not currently provide a database
change webhook. TTL alone is not an immediate-removal guarantee, particularly
during backend outages. CDN tag/path purging must be confirmed on the actual
Netlify deployment before treating its deployed behavior as verified.

## Measurements

These are **local `next build --webpack` / `next start` measurements against a
synthetic anonymous Supabase fixture with a fixed 100 ms wait per HTTP call**.
They are not measurements of production Netlify, Supabase SQL or an edge POP.
Before and after used the same fixture and installed versions. The first
request was separated from twenty subsequent requests; after also measured
ten forced page/data misses with connections already established.

| Measurement                              |   Before |         After |
| ---------------------------------------- | -------: | ------------: |
| Cold response headers (one sample)       | 384.8 ms |      543.1 ms |
| Cold HTML body complete (one sample)     | 705.8 ms |      548.3 ms |
| Warm response headers median, 20 samples | 143.7 ms |       14.6 ms |
| Warm response headers p95                | 177.1 ms |       27.9 ms |
| Warm HTML body complete median           | 366.3 ms |       15.3 ms |
| Warm HTML body complete p95              | 421.6 ms |       31.2 ms |
| Backend HTTP calls across 20 warm GETs   |       60 |             0 |
| Full-route cache header on warm GETs     |   absent | HIT on all 20 |

The old streaming response could send the shell before its database work
finished. The new cold ISR response waits for the complete page, explaining
the higher cold header latency despite a shorter complete response. Warm
uncached before values also reflect streaming; do not compare only TTFB to
judge when the actual job content arrives.

After forced invalidation (10 samples), median header time was 265.1 ms and
p95 was 280.1 ms; median complete-response time was 265.9 ms and p95 281.3 ms.
These are page/data misses with a potentially warm proxy tombstone and reusable
connections, not ten independent cold worker starts.

Opt-in server spans from the final run showed median proxy execution of
0.10 ms across 37 requests (cold tombstone maximum 143.32 ms), published-job
query wait 120.76 ms, similar-job query wait 107.85 ms, transformation work
0.34 ms, and page-entry-through-response-completion 248.54 ms on the 16 renders.
Cache hits bypass page rendering. These span samples cover different miss,
expiry and removal cases; overlapping spans must not be summed.

The configured live Supabase project was also profiled with **anonymous,
read-only** SDK calls after running outside the sandbox (the sandbox's earlier
`ENOTFOUND` was not evidence that the configured project was unavailable).
All 15 calls succeeded, with retries disabled only in the diagnostic:

| Live backend operation, 5 attempts each | Median elapsed |          Range |
| --------------------------------------- | -------------: | -------------: |
| Tombstone lookup                        |       1,582 ms | 1,372–4,545 ms |
| Published job lookup                    |       1,699 ms | 1,298–4,655 ms |
| Similar cards                           |       1,373 ms | 1,308–3,241 ms |
| Same-host health endpoint               |       1,547 ms | 1,230–2,913 ms |

These actual external waits corroborate the reported multi-second requests.
The health endpoint is also slow, so the evidence is consistent with a broader
network/gateway/service-path delay, rather than uniquely a slow jobs query.
That is an inference, not a SQL query-plan diagnosis: transport stages and
database execution have not been independently timed. First attempts were
particularly slow; subsequent requests remained above one second. None of
these are deployed page/edge response measurements. Data and identifiers were
kept out of the timing artifacts.

The fetch-header timings above approximate client-observed TTFB. Body-complete
timing includes only the HTML response, **not** JavaScript/CSS downloads,
hydration, browser load events or the deliberate Apply countdown. Server spans
also exclude framework work before page entry and the separately measured
proxy. The deployed under-50-ms target has not been measured or claimed.

## Validation and reproducing

Passed:

- Full ESLint, Next route/type generation and TypeScript checks.
- 17 unit tests, including actual PostgreSQL RLS tests for anonymous readers,
  other posters, inactive posters and admins; public projection/secret logging
  checks; and tombstone capacity/expiry/concurrency/failure behavior.
- Optimized production webpack build and start, with repeated HTTP assertions
  for anonymous public content, actual cache HIT/MISS headers and query counts,
  updates, unpublishing, republishing a cached 404, expired noindex pages without
  JobPosting JSON-LD, deletion removal and eventual 410.
- Anonymous protected admin redirect (307), unauthorized expiry mutation (401),
  no public auth calls, and no Set-Cookie on public responses in the fixture.

The default Turbopack build hit a CSS-worker sandbox failure. The supported
webpack build passed outside the sandbox; application package scripts and
bundler defaults were not changed. The fixture build uses `.next-test`, leaving
the normal development `.next` output separate.

Run `npx tsx scripts/benchmark-public-jobs.ts after` to build/start the synthetic
fixture and repeat the assertions. It writes JSON timing results and opt-in
server traces under `verification/public-performance-after.*` and stops its
servers afterward. `before` is a label for running the same harness on a
baseline checkout; it does not revert source code. The supplied baseline JSON
was recorded before the public implementation changed.

For real server profiling, set `PERF_REQUESTS=1` and use equivalent requests on
the deployed version. Logs contain fixed operation labels, random trace IDs,
durations and HTTP statuses, never slugs, cookies, tokens or query parameters.
Unset the variable after collection; logging is disabled by default. Query HTTP
spans include header wait; complete query spans include body decoding/retries.

No production deployment, actual Supabase EXPLAIN, geographically distributed
TTFB test, browser load benchmark or live authenticated-admin session was
available for this run. Cold workers still pay the tombstone network wait;
uncached rendering still requires a job query followed by a category-dependent
card query. Those waits need actual backend/region measurements before further
database or infrastructure changes are justified.

## Files changed for this public-route task

Runtime:

- `proxy.ts`, `next.config.ts`, `app/jobs/[slug]/page.tsx`
- `lib/data.ts`, `lib/public-job-cache.ts`, `lib/public-job-fields.ts`
- `lib/deleted-job-cache.ts`, `lib/tombstone-cache.ts`, `lib/revalidate.ts`
- `lib/performance.ts`, `lib/jobs.ts`, `lib/seo/schema.ts`, `lib/public-api.ts`
- `components/job-card.tsx` (data type only, no UI changes)

Verification:

- `scripts/benchmark-public-jobs.ts`
- `scripts/profile-public-job.ts` (anonymous real-backend diagnostics; usage takes a public slug)
- `tests/unit/api.test.ts`, `tests/unit/rls.test.ts`, `tests/unit/tombstone-cache.test.ts`
- `verification/public-performance-before.*`, `verification/public-performance-after.*`
- `verification/public-network.json`, `verification/public-network-health.json`
- This report. Existing unrelated working-tree changes were preserved.
