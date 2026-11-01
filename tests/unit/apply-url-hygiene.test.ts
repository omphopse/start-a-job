import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applicationUrl } from '../../lib/application-method';
import { isJobAggregator } from '../../lib/apply-url-hygiene';
import { publicJob } from '../../lib/public-api';
import { jobSchema } from '../../lib/seo/schema';
import { sampleJobs } from '../../lib/sample-jobs';

test('URL validation cleans tracking but preserves functional IDs, signed parameters and anchors', () => {
  const input =
    'https://company.com/jobs?jobId=123&utm_source=mail&FBCLID=abc&ref=listing&source=feed&gh_jid=9&signature=abc#apply';
  const clean = applicationUrl.parse(input);
  assert.equal(clean, 'https://company.com/jobs?jobId=123&gh_jid=9&signature=abc#apply');
  assert.equal(applicationUrl.parse(clean), clean);
  assert.equal(
    applicationUrl.parse('https://company.com/jobs?q=hello%20world'),
    'https://company.com/jobs?q=hello%20world',
  );
  const job = { ...sampleJobs[0], apply_url: input };
  assert.equal(publicJob(job).source_apply_url, clean);
  assert.equal(jobSchema(job).applicationContact?.url, clean);
  for (const url of ['https://wa.me/123', 'https://tinyurl.com/x', 'https://bit.ly/x'])
    assert.equal(applicationUrl.safeParse(url).success, false);
});
test('aggregator warnings include subdomains without blocking otherwise valid URLs', () => {
  for (const host of [
    'unstop.com',
    'naukri.com',
    'indeed.com',
    'linkedin.com',
    'internshala.com',
    'shine.com',
  ]) {
    assert.ok(isJobAggregator(`https://jobs.${host}/123`));
    assert.ok(applicationUrl.safeParse(`https://${host}/123`).success);
    assert.equal(isJobAggregator(`https://${host}.example.com/123`), false);
  }
});
