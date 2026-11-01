// Local production-mode integration benchmark. The backend is a synthetic,
// anonymous-only Supabase fixture, never the configured database.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { writeFile, mkdir } from 'node:fs/promises';
import { sampleJobs } from '../lib/sample-jobs';

async function main() {
  const label = process.argv[2] || 'after';
  assert.match(label, /^[a-z-]+$/);
  const delay = 100;
  let job = { ...sampleJobs[0], slug: 'performance-fixture-job' };
  const expiredJob = { ...sampleJobs[0], slug: 'performance-expired-job', last_date: '2000-01-01' };
  let deleted = false;
  const counts: Record<string, number> = {};
  const backend = createServer(async (req, res) => {
    const url = new URL(req.url!, 'http://localhost');
    const table = url.pathname.split('/').at(-1)!;
    counts[table] = (counts[table] || 0) + 1;
    await new Promise((resolve) => setTimeout(resolve, delay));
    res.setHeader('Content-Type', 'application/json');
    if (table === 'take_rate_limit') {
      res.end('true');
      return;
    }
    let rows: Record<string, unknown>[] = [];
    if (table === 'jobs') {
      rows = !deleted && job.status === 'published' ? [job] : [];
      for (const key of ['slug', 'id', 'status', 'last_date', 'category']) {
        const filter = url.searchParams.get(key);
        if (filter?.startsWith('eq.'))
          rows = rows.filter((row) => String(row[key]) === filter.slice(3));
        if (filter?.startsWith('neq.'))
          rows = rows.filter((row) => String(row[key]) !== filter.slice(4));
      }
    }
    if (table === 'deleted_jobs') rows = deleted ? [{ slug: job.slug }] : [];
    if (table === 'get_expired_job') {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const input = JSON.parse(Buffer.concat(chunks).toString() || '{}');
      rows = input.p_slug === expiredJob.slug ? [expiredJob] : [];
    }
    if (table === 'categories') rows = [{ name: job.category }];
    const select = url.searchParams.get('select');
    if (select && select !== '*')
      rows = rows.map((row) => Object.fromEntries(select.split(',').map((key) => [key, row[key]])));
    res.setHeader('Content-Range', `0-${Math.max(0, rows.length - 1)}/${rows.length}`);
    if (req.headers.accept?.includes('application/vnd.pgrst.object+json')) {
      if (!rows.length) {
        res.statusCode = 406;
        res.end(JSON.stringify({ code: 'PGRST116', details: '0 rows' }));
        return;
      }
      res.end(JSON.stringify(rows[0]));
    } else res.end(JSON.stringify(rows));
  });
  backend.listen(0, '127.0.0.1');
  await once(backend, 'listening');
  const address = backend.address();
  assert.ok(address && typeof address !== 'string');
  const env = {
    ...process.env,
    PLAYWRIGHT_TEST: 'true',
    NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${address.port}`,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'local-public-fixture',
    SUPABASE_SERVICE_ROLE_KEY: 'local-fixture-only',
    CRON_SECRET: 'local-performance-fixture',
    DEMO_MODE: 'false',
    PERF_REQUESTS: '1',
    NEXT_PUBLIC_SITE_URL: 'http://localhost:3118',
    NEXT_PUBLIC_SITE_NAME: 'startajob',
    NEXT_PUBLIC_ADSENSE_CLIENT: '',
    INDEXNOW_KEY: '',
    GOOGLE_INDEXING_SA_JSON: '',
  };
  const next = 'node_modules/next/dist/bin/next';
  let app: ReturnType<typeof spawn> | undefined;
  let logs = '';
  const capture = (chunk: Buffer) => {
    logs += chunk.toString();
  };
  try {
    console.log(`Building production fixture (${label}); backend delay ${delay} ms per HTTP call.`);
    // Historical comparisons use webpack; opt in to Next's default builder
    // when verifying the production build without changing package scripts.
    const bundlerArgs = process.argv.includes('--turbopack') ? [] : ['--webpack'];
    const build = spawn(process.execPath, [next, 'build', ...bundlerArgs], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    build.stdout!.on('data', capture);
    build.stderr!.on('data', capture);
    const [code] = await once(build, 'exit');
    if (code !== 0) throw new Error(`Production build failed:\n${logs.slice(-10000)}`);
    app = spawn(process.execPath, [next, 'start', '--port', '3118'], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    app.stdout!.on('data', capture);
    app.stderr!.on('data', capture);
    const base = 'http://localhost:3118';
    let ready = false;
    for (let i = 0; i < 120; i++) {
      try {
        await fetch(base + '/favicon.ico');
        ready = true;
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
    assert.ok(ready, 'production server starts');
    for (const key of Object.keys(counts)) delete counts[key];
    async function read(path: string) {
      const started = performance.now();
      const response = await fetch(base + path, { redirect: 'manual' });
      const ttfb = performance.now() - started;
      const html = await response.text();
      return {
        status: response.status,
        ttfb_ms: ttfb,
        response_ms: performance.now() - started,
        cache: response.headers.get('x-nextjs-cache'),
        cacheControl: response.headers.get('cache-control'),
        setCookie: response.headers.has('set-cookie'),
        html,
      };
    }
    const path = '/jobs/' + job.slug;
    const first = await read(path);
    assert.equal(first.status, 200);
    assert.match(first.html, /JobPosting/);
    assert.ok(first.html.includes(job.title));
    assert.equal(first.setCookie, false);
    const coldCounts = { ...counts };
    const samples = [];
    for (let i = 0; i < 20; i++) samples.push(await read(path));
    const warmCounts = { ...counts };
    const percentile = (values: number[], fraction: number) =>
      [...values].sort((a, b) => a - b)[Math.ceil(values.length * fraction) - 1];
    const invalidate = async () => {
      const r = await fetch(base + '/api/internal/expire', {
        method: 'POST',
        headers: { Authorization: 'Bearer local-performance-fixture' },
      });
      assert.equal(r.status, 200);
    };
    const forcedMisses = [];
    if (label !== 'before') {
      for (let i = 0; i < 10; i++) {
        await invalidate();
        const miss = await read(path);
        assert.equal(miss.status, 200);
        assert.equal(miss.cache, 'MISS');
        forcedMisses.push(miss);
      }
    }
    const expired = await read('/jobs/' + expiredJob.slug);
    assert.equal(expired.status, 200);
    assert.match(expired.html, /This job has expired/);
    assert.doesNotMatch(expired.html, /"@type":"JobPosting"/);
    assert.match(expired.html, /noindex/);
    const forbiddenCron = await fetch(base + '/api/internal/expire', { method: 'POST' });
    assert.equal(forbiddenCron.status, 401);
    job = { ...job, title: 'Updated performance fixture' };
    await invalidate();
    const updated = await read(path);
    assert.ok(updated.html.includes(job.title), 'update is visible after invalidation');
    if (label === 'rebrand') {
      for (const route of ['/', '/about', '/admin/login', path]) {
        const branded = await read(route);
        assert.equal(branded.status, 200);
        assert.match(branded.html, /name="application-name" content="startajob"/);
        assert.doesNotMatch(branded.html, /DeskJobs/);
      }
      const home = await read('/');
      assert.match(home.html, /name="twitter:title" content="startajob/);
      assert.match(home.html, /property="og:site_name" content="startajob"/);
      const api = await read('/api/public/jobs.json?limit=1');
      assert.equal(api.status, 200);
      assert.equal(JSON.parse(api.html).attribution, 'Source: startajob');
      const openapi = await read('/openapi.json');
      assert.equal(JSON.parse(openapi.html).info.title, 'startajob public jobs');
      assert.match((await read('/feed.xml')).html, /<title>startajob<\/title>/);
      assert.match((await read('/llms.txt')).html, /^# startajob\n/);
    }
    let emailApplication, urlApplication;
    if (label !== 'before') {
      const previousUrl = job.apply_url;
      job = { ...job, apply_url: null, application_email: 'Recruitment+jobs@example.com' };
      await invalidate();
      emailApplication = await read(path);
      assert.equal(emailApplication.status, 200);
      assert.match(emailApplication.html, /Apply via email/);
      assert.match(emailApplication.html, /Send Application/);
      assert.match(emailApplication.html, /mailto:Recruitment%2Bjobs@example.com/);
      assert.doesNotMatch(emailApplication.html, /apply-link|countdown-message/);
      const emailHit = await read(path);
      assert.equal(emailHit.cache, 'HIT');
      assert.match(emailHit.html, /Send Application/);
      job = { ...job, apply_url: previousUrl, application_email: null };
      await invalidate();
      urlApplication = await read(path);
      assert.equal(urlApplication.status, 200);
      assert.match(urlApplication.html, /apply-link|countdown-message/);
      assert.doesNotMatch(urlApplication.html, /Send Application|mailto:/);
    }
    job = { ...job, status: 'unpublished' as typeof job.status };
    await invalidate();
    const unpublished = await read(path);
    if (label !== 'before') assert.equal(unpublished.status, 404);
    else assert.ok([200, 404].includes(unpublished.status));
    assert.doesNotMatch(unpublished.html, /"@type":"JobPosting"/);
    job = { ...job, status: 'published' };
    await invalidate();
    const republished = await read(path);
    assert.equal(republished.status, 200);
    assert.match(republished.html, /JobPosting/);
    deleted = true;
    await invalidate();
    const removedImmediately = await read(path);
    assert.ok(
      [404, 410].includes(removedImmediately.status),
      'deletion removes the content immediately',
    );
    if (removedImmediately.status !== 410)
      await new Promise((resolve) => setTimeout(resolve, 10_100));
    const removed = await read(path);
    assert.equal(removed.status, 410, 'deleted listing retains HTTP 410');
    const admin = await read('/admin/jobs/00000000-0000-4000-8000-000000000001');
    assert.equal(admin.status, 307, 'anonymous admin access redirects');
    assert.equal(counts.user || 0, 0, 'public requests never call auth');
    const clean = (value: Awaited<ReturnType<typeof read>>) => ({
      status: value.status,
      ttfb_ms: value.ttfb_ms,
      response_ms: value.response_ms,
      cache: value.cache,
      cacheControl: value.cacheControl,
      setCookie: value.setCookie,
    });
    const result = {
      label,
      environment:
        'local next build/start with synthetic anonymous Supabase fixture; not production infrastructure',
      backend_delay_ms: delay,
      cold: clean(first),
      coldCounts,
      warmCounts,
      warm_samples: samples.length,
      forced_miss_samples: forcedMisses.length,
      forced_misses: forcedMisses.length
        ? {
            ttfb_median_ms: percentile(
              forcedMisses.map((s) => s.ttfb_ms),
              0.5,
            ),
            ttfb_p95_ms: percentile(
              forcedMisses.map((s) => s.ttfb_ms),
              0.95,
            ),
            response_median_ms: percentile(
              forcedMisses.map((s) => s.response_ms),
              0.5,
            ),
            response_p95_ms: percentile(
              forcedMisses.map((s) => s.response_ms),
              0.95,
            ),
          }
        : null,
      warm: {
        ttfb_median_ms: percentile(
          samples.map((s) => s.ttfb_ms),
          0.5,
        ),
        ttfb_p95_ms: percentile(
          samples.map((s) => s.ttfb_ms),
          0.95,
        ),
        response_median_ms: percentile(
          samples.map((s) => s.response_ms),
          0.5,
        ),
        response_p95_ms: percentile(
          samples.map((s) => s.response_ms),
          0.95,
        ),
        cache_statuses: [...new Set(samples.map((s) => s.cache))],
      },
      updated: clean(updated),
      emailApplication: emailApplication ? clean(emailApplication) : null,
      urlApplication: urlApplication ? clean(urlApplication) : null,
      unpublished: clean(unpublished),
      expired: clean(expired),
      republished: clean(republished),
      deleted: clean(removed),
      deletedImmediately: clean(removedImmediately),
      admin: clean(admin),
    };
    if (label !== 'before') {
      assert.deepEqual(warmCounts, coldCounts, 'cache hits make zero backend calls');
      assert.ok(
        samples.every((s) => s.cache === 'HIT'),
        'actual Next full-route cache hits',
      );
    }
    await mkdir('verification', { recursive: true });
    await writeFile(
      `verification/public-performance-${label}.json`,
      JSON.stringify(result, null, 2),
    );
    console.log(JSON.stringify(result, null, 2));
  } finally {
    if (app) {
      app.kill();
      await once(app, 'exit');
    }
    backend.closeAllConnections();
    backend.close();
    await mkdir('verification', { recursive: true });
    await writeFile(`verification/public-performance-${label}.log`, logs);
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
