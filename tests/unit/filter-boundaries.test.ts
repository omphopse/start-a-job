import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFilters, jobInput } from '../../lib/validation';
import { apiQuery } from '../../lib/public-api';
import { sampleJobs } from '../../lib/sample-jobs';
import { spawnSync } from 'node:child_process';

test('out-of-range PostgREST results preserve the requested filters and public total', () => {
  const result = spawnSync(
    process.execPath,
    ['--conditions=react-server', '--import=tsx', 'tests/fixtures/pagination-probe.mjs'],
    { encoding: 'utf8', timeout: 30_000 },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /PASS PostgREST out-of-range fallback/);
});

test('public filter boundaries match the accepted page cap and job location lengths', () => {
  const text = 'X'.repeat(100);
  assert.equal(parseFilters({ page: '10000' }).page, '10000');
  assert.equal(parseFilters({ page: '10001' }).page, undefined);
  assert.equal(parseFilters({ state: text, location: text }).state, text);
  assert.equal(parseFilters({ state: text, location: text }).city, text);
  assert.equal(parseFilters({ state: text + 'X' }).state, undefined);
  assert.equal(apiQuery.safeParse({ state: text }).success, true);
  assert.equal(apiQuery.safeParse({ state: text + 'X' }).success, false);
  assert.equal(apiQuery.parse({}).limit, 20);
  assert.equal(
    jobInput.safeParse({
      ...sampleJobs[0],
      state: text,
      location: text,
      official_confirmed: 'on',
      no_fees: 'on',
    }).success,
    true,
  );
});

test('retired public filters are silently ignored, including malformed values', () => {
  for (const legacy of [
    { qualification: 'Any graduate', experience_level: 'fresher' },
    { qualification: "'; drop table jobs;--", experience_level: 'x'.repeat(1000) },
  ]) {
    assert.deepEqual(parseFilters({ ...legacy, state: 'Delhi' }), { state: 'Delhi' });
    assert.deepEqual(apiQuery.parse(legacy), { page: 1, limit: 20 });
  }
});
