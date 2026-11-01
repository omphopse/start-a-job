# Admin job edit request performance

## Findings

The reported request spent 11 ms in the proxy and approximately 4.7 s in
application code. This narrows the investigation to rendering/data access; it
does not establish database execution time.

The inspected lifecycle for `/admin/jobs/[id]` is:

1. Proxy reads the session and refreshes cookies if needed. This is only an
   optimistic check. It does not authorize access to records.
2. Root layout renders static navigation/footer; admin layout returns children.
   Neither performs I/O. This page is explicitly dynamic.
3. The page validates the UUID (or accepts `new`).
4. In parallel, the page verifies claims and reads the active profile, reads
   public categories, and reads the job using the cookie-authenticated client.
5. The page checks job existence and, for posters, ownership and editable
   status before returning any record to the client.
6. JobForm and CategoryForm initialize local state. AdminJobControls renders
   forms. Their Server Actions are invoked on submission, not during this GET.
   No polling, effects, N+1 reads, joins, RPCs, or SEO notifications run here.

Previously step 4 waited for the profile/categories before starting the job
read. That unnecessary dependency is confirmed in the code. The job read now
overlaps that work. Authentication and the profile query remain sequential
because the profile lookup requires the verified subject. React cache reuses
the client/profile only within the render; private records are not cached
between users or requests. Categories alone use the existing public cache,
invalidated immediately by the category mutation.

The job and profile lookups filter on primary keys already declared in the
migration. No additional index is justified without a live query plan. The
job form consumes most job fields, including the long text fields; no large
payload or database scan has yet been established. The profile projection is
now limited to the five fields of its existing public application type.

The installed PostgREST SDK can retry idempotent reads after network failures
or HTTP 503/520 responses. Retry behavior has not been disabled. Individual
HTTP timings allow repeated attempts and backoff gaps to be identified.

## Collect real timings

In PowerShell, start the app with diagnostics enabled:

```powershell
$env:PERF_REQUESTS = '1'
npm run dev
```

Visit the same edit URL with an existing authorized session. Keep the same
user, record, database, deployment region and connection. Separate the first
compile, first signing-key lookup, category cache miss and expired-session
refresh from warm requests. Collect at least five warm requests; compare
medians and tails, rather than a single request. Repeat against a baseline
checkout with the same diagnostic wrappers but the original sequential page
read to establish an equivalent before/after comparison.

Structured `request-performance` records contain only random trace IDs,
fixed operation names, milliseconds and optional HTTP statuses:

- `admin-proxy`: `auth.refreshSession`, individual auth HTTP calls, `total`.
- `server-render`: `auth.verifyClaims`, `query.activeProfile`,
  `categories.read`, `query.editJob`, `page.data`, `page.authorization`,
  `page.component`, individual HTTP calls, and `total`.
- `categories-cache-fill`: the real category query and its HTTP calls, only
  when the cache needs to load. Its trace is intentionally independent of a
  render because the public cached function cannot read request state.

Within a render, use the shared trace ID to group operations. Proxy and cache
fill scopes have independent trace IDs. For isolated profiling, issue one
navigation at a time. Concurrent span durations overlap and must not be added.
`http.*` ends when fetch returns response headers. `query.*` includes body
consumption/decoding and any SDK retries/backoff. A failed operation is still
timed; the timing log deliberately excludes error contents.

`page.authorization` measures post-query authorization work; `page.component`
ends before React renders descendants. The render `total` runs in Next's
`after()` callback and measures page entry through response completion,
including downstream render/stream time and callback scheduling. It excludes
proxy time and framework work before page entry. Use Next's request log for
the authoritative whole-request total. Logs are off unless explicitly enabled.

An HTTP span measures the app-to-Supabase wait, not pure SQL execution. To
distinguish network/gateway time from SQL/RLS time, correlate the slow operation
with Supabase query logs or a privileged read-only EXPLAIN analysis with the
same authenticated role and policies. Never bypass RLS for a benchmark.

Disable diagnostics after collecting measurements:

```powershell
Remove-Item Env:PERF_REQUESTS
```

## Validation and limits

The supplied pre-change observation is approximately 4.7 s; no equivalent
authenticated post-change request has been measured in this execution
environment. An unauthenticated health probe to the configured Supabase host
fails with `ENOTFOUND`, so it cannot establish backend latency. No test account
or authenticated browser session was supplied for this run. Authorized live page
rendering and actual end-to-end improvement therefore remain unverified.

Unit coverage checks opt-in/sanitized timing output and real PostgreSQL RLS
behavior for anonymous users, a different poster, an admin and an inactive
poster. These are access-policy checks, not substitutes for an authenticated
browser test. Keep the live profiling results separate from local test times.
