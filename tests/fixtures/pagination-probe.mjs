// Exercise the real SDK/query path with a deterministic PostgREST transport.
import assert from 'node:assert/strict';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://audit.example.invalid';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'audit-only-anon-key';
process.env.DEMO_MODE = 'false';
process.env.PERF_REQUESTS = '0';
const requests = [];
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  requests.push(url);
  assert.equal(JSON.parse(init.body).p_state, 'Maharashtra');
  assert.equal(url.pathname, '/rest/v1/rpc/search_public_jobs');
  assert.equal(new Headers(init?.headers).get('Prefer')?.includes('count=exact'), true);
  for (const field of ['status', 'created_at', 'updated_at', 'search_document']) {
    assert.equal(url.searchParams.has(field), false);
    assert.equal(url.searchParams.get('select').split(',').includes(field), false);
    assert.equal(url.searchParams.get('order')?.includes(field) || false, false);
  }
  if (url.searchParams.get('offset') === '199980')
    return Response.json(
      { code: 'PGRST103', message: 'Requested range not satisfiable' },
      { status: 416 },
    );
  return Response.json([{ id: '00000000-0000-4000-8000-111111111111' }], {
    headers: { 'content-range': '0-0/10' },
  });
};
const dataModule = await import('../../lib/data.ts');
const listJobs = dataModule.listJobs || dataModule.default?.listJobs;
const result = await listJobs({ page: '10000', state: 'Maharashtra' }, 20);
assert.deepEqual(result, { jobs: [], count: 10 });
assert.equal(requests.length, 2);
assert.equal(requests[0].searchParams.has('state'), false);
assert.equal(requests[1].searchParams.has('state'), false);
assert.equal(requests[1].searchParams.get('offset'), '0');
console.log(
  'PASS PostgREST out-of-range fallback preserves filters and total without returning first-page jobs',
);
