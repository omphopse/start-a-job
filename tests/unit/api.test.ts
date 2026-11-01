import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apiQuery, publicJob } from '../../lib/public-api';
import { sampleJobs } from '../../lib/sample-jobs';
import { publicJobColumns, jobCardColumns } from '../../lib/public-job-fields';
test('API limits and field allowlist protect private data', () => {
  assert.equal(apiQuery.safeParse({ limit: 101 }).success, false);
  assert.equal(apiQuery.safeParse({ page: -1 }).success, false);
  assert.equal(apiQuery.safeParse({ status: 'draft' }).success, false);
  const job = publicJob(sampleJobs[0]);
  for (const key of ['created_by', 'approved_by', 'email', 'rejection_reason', 'status'])
    assert.equal(key in job, false);
  assert.equal(job.source_apply_url, sampleJobs[0].apply_url);
});
test('shared public query projections exclude private moderation and identity fields', () => {
  for (const columns of [publicJobColumns, jobCardColumns]) {
    const selected = new Set(columns.split(','));
    for (const field of [
      '*',
      'created_by',
      'approved_by',
      'rejection_reason',
      'search_document',
      'created_at',
      'updated_at',
      'status',
      'email',
    ])
      assert.equal(selected.has(field), false, `${field} must not enter a public cache`);
    assert.ok(selected.has('id') && selected.has('slug'));
  }
  const cards = new Set(jobCardColumns.split(','));
  for (const text of ['summary', 'eligibility', 'documents_needed', 'how_to_apply'])
    assert.equal(cards.has(text), false, 'similar cards do not fetch long job descriptions');
});
