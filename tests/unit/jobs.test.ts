import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isCurrent } from '../../lib/jobs';
import { sampleJobs, expiredSample } from '../../lib/sample-jobs';
import { readFileSync } from 'node:fs';
test('current visibility excludes expired and unpublished jobs', () => {
  assert.equal(isCurrent(sampleJobs[0]), true);
  assert.equal(isCurrent(expiredSample), false);
  for (const status of ['draft', 'pending', 'rejected', 'unpublished'] as const)
    assert.equal(isCurrent({ ...sampleJobs[0], status }), false);
});
test('sample data is visibly fictional and uses example.com', () => {
  assert.equal(sampleJobs.length, 10);
  for (const job of sampleJobs) {
    assert.match(job.company_name, /Sample/);
    assert.equal(new URL(job.apply_url).host, 'example.com');
  }
});
test('migration includes DB-level poster guard and RLS on every table', () => {
  const sql = readFileSync('supabase/migrations/202610300001_initial.sql', 'utf8');
  for (const table of [
    'profiles',
    'jobs',
    'apply_clicks',
    'job_reports',
    'landing_pages',
    'deleted_jobs',
    'request_limits',
  ])
    assert.ok(sql.includes(`alter table ${table} enable row level security`));
  assert.match(sql, /create trigger guard_job_write/);
  assert.match(sql, /Posters cannot publish/);
});
