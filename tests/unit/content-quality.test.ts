import { test } from 'node:test';
import assert from 'node:assert/strict';
import { feedExcerpt } from '../../lib/feed-excerpt';
import { jobFormInput } from '../../lib/validation';
import { sampleJobs } from '../../lib/sample-jobs';
test('original summary confirmation is required but never persisted', () => {
  const input = {
    ...sampleJobs[0],
    application: sampleJobs[0].apply_url,
    official_confirmed: 'on',
    no_fees: 'on',
  };
  assert.equal(jobFormInput.safeParse(input).success, false);
  const parsed = jobFormInput.parse({ ...input, original_summary: 'on' });
  assert.equal('original_summary' in parsed, false);
});
test('feed excerpt strips markup, collapses whitespace and caps Unicode characters at 300', () => {
  assert.equal(feedExcerpt('<p>Hello</p>\n<b>world</b>'), 'Hello world');
  assert.equal(Array.from(feedExcerpt('😀'.repeat(350))).length, 300);
  assert.equal(feedExcerpt('x'.repeat(500)).length, 300);
});
