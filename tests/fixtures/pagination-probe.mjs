// Exercise the real SDK/query path with a deterministic PostgREST transport.
import assert from 'node:assert/strict';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://audit.example.invalid';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'audit-only-anon-key';
process.env.DEMO_MODE = 'false';
process.env.PERF_REQUESTS = '0';
const requests = [];
globalThis.fetch = async (input) => {
  const url = new URL(String(input));
  requests.push(url);
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
assert.equal(requests[0].searchParams.get('state'), 'ilike.Maharashtra');
assert.equal(requests[1].searchParams.get('state'), 'ilike.Maharashtra');
assert.equal(requests[1].searchParams.get('offset'), '0');
console.log(
  'PASS PostgREST out-of-range fallback preserves filters and total without returning first-page jobs',
);
