import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ApplicationPanel } from '../../components/application-panel';
import { sampleJobs, emailSample } from '../../lib/sample-jobs';
import { publicJob } from '../../lib/public-api';
import { jobSchema } from '../../lib/seo/schema';
import { verifyApplicationHtml, verifyLocationSchema } from '../../lib/seo/verify-job-html';

test('SEO verifier accepts a real server-rendered URL apply anchor', () => {
  const html = renderToStaticMarkup(
    createElement(ApplicationPanel, { job: sampleJobs[0], delay: 10 }),
  );
  assert.doesNotThrow(() => verifyApplicationHtml(publicJob(sampleJobs[0]), html));
});

test('SEO verifier accepts delayed email disclosure without demanding an immediate mailto link', () => {
  const html = renderToStaticMarkup(
    createElement(ApplicationPanel, { job: emailSample, delay: 10 }),
  );
  assert.doesNotThrow(() => verifyApplicationHtml(publicJob(emailSample), html));
});

test('SEO verifier accepts an omitted optional city in actual JobPosting markup', () => {
  const job = { ...sampleJobs[0], location: '', state: '', country: 'Canada' };
  assert.doesNotThrow(() => verifyLocationSchema(job.location, jobSchema(job).jobLocation.address));
});
