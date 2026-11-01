import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  applicationInput,
  applicationMailto,
  getApplicationMethod,
} from '../../lib/application-method';
import { jobFormInput, jobInput } from '../../lib/validation';
import { sampleJobs } from '../../lib/sample-jobs';
import { publicJob } from '../../lib/public-api';
import { ApplicationPanel } from '../../components/application-panel';

test('application input trims URLs and normalizes only the email domain', () => {
  assert.deepEqual(applicationInput.parse('  https://company.com/careers?role=JS&level=1  '), {
    apply_url: 'https://company.com/careers?role=JS&level=1',
    application_email: null,
  });
  assert.deepEqual(applicationInput.parse('  Recruitment+Frontend@COMPANY.COM  '), {
    apply_url: null,
    application_email: 'Recruitment+Frontend@company.com',
  });
  for (const input of [
    '',
    'not-an-email',
    'hr@',
    'hr@@company.com',
    'hr@company',
    'a..b@company.com',
    'hr@company.com\r\nBcc:other@company.com',
    'hr@company.com,other@company.com',
    'http://company.com',
    'javascript:hr@company.com',
    'mailto:hr@company.com',
    'https://user@company.com',
    'https://company.com:8080/jobs',
    'https://wa.me/123',
    'https://bit.ly/test',
    'https://127.0.0.1/x',
    'https:company.com',
    'https:///company.com',
    'https://company.com\\@evil.com',
    'https://company.com/jobs bad',
  ])
    assert.equal(applicationInput.safeParse(input).success, false, input);
});
test('create/edit form values always replace both application columns', () => {
  const fields = {
    ...sampleJobs[0],
    original_summary: 'on',
    official_confirmed: 'on',
    no_fees: 'on',
  };
  const url = jobFormInput.parse({ ...fields, application: 'https://company.com/jobs' });
  const email = jobFormInput.parse({ ...fields, application: 'Jobs@COMPANY.COM' });
  assert.equal(url.apply_url, 'https://company.com/jobs');
  assert.equal(url.application_email, null);
  assert.equal(email.apply_url, null);
  assert.equal(email.application_email, 'Jobs@company.com');
  assert.equal(
    'application' in email,
    false,
    'the UI field must not be persisted as an unknown column',
  );
  const switchedToEmail = { ...url, ...email };
  assert.ok(jobInput.safeParse(switchedToEmail).success);
  assert.equal(switchedToEmail.apply_url, null);
  const switchedToUrl = { ...switchedToEmail, ...url };
  assert.ok(jobInput.safeParse(switchedToUrl).success);
  assert.equal(switchedToUrl.application_email, null);
  assert.ok(
    jobInput.safeParse(fields).success,
    'legacy URL records without a populated email still validate',
  );
  assert.equal(jobInput.parse({ ...fields, application_email: undefined }).application_email, null);
  assert.equal(
    jobInput.safeParse({ ...fields, application_email: 'jobs@company.com' }).success,
    false,
  );
  assert.equal(
    jobInput.safeParse({ ...fields, apply_url: null, application_email: null }).success,
    false,
  );
  assert.equal(jobFormInput.safeParse({ ...fields, application: '' }).success, false);
});
test('email links encode recipient and subject without prefilled private data', () => {
  const href = applicationMailto('Recruitment+Jobs@company.com', 'R&D / QA?', 'Company & Co');
  assert.equal(href.split('?')[0], 'mailto:Recruitment%2BJobs@company.com');
  assert.equal(
    new URLSearchParams(href.slice(href.indexOf('?') + 1)).get('subject'),
    'Application for R&D / QA? – Company & Co',
  );
  assert.equal(new URLSearchParams(href.slice(href.indexOf('?') + 1)).has('body'), false);
  assert.throws(() => applicationMailto('a@company.com\r\nBcc:b@company.com'));
});
test('email and URL applications render their configured countdown', () => {
  const emailJob = { ...sampleJobs[0], apply_url: null, application_email: 'jobs@company.com' };
  const html = renderToStaticMarkup(createElement(ApplicationPanel, { job: emailJob, delay: 10 }));
  assert.match(html, /Apply via email/);
  assert.match(html, /Send Application/);
  assert.doesNotMatch(html, /href="mailto:|jobs@company.com/);
  assert.match(html, /available in 10s/);
  assert.match(html, /disabled=""/);
  assert.match(html, /Application email countdown/);
  const urlHtml = renderToStaticMarkup(
    createElement(ApplicationPanel, { job: sampleJobs[0], delay: 10 }),
  );
  assert.match(urlHtml, /available in 10s/);
  assert.match(urlHtml, /aria-disabled="true"/);
  assert.match(urlHtml, /noopener noreferrer nofollow/);
  for (const job of [
    { apply_url: null, application_email: null },
    { apply_url: 'javascript:alert(1)', application_email: null },
    { apply_url: null, application_email: 'invalid' },
    { apply_url: 'https://company.com', application_email: 'jobs@company.com' },
  ]) {
    assert.equal(getApplicationMethod(job), null);
    const unavailable = renderToStaticMarkup(
      createElement(ApplicationPanel, { job: { ...sampleJobs[0], ...job }, delay: 10 }),
    );
    assert.match(unavailable, /Applications unavailable/);
    assert.doesNotMatch(unavailable, /href=/);
  }
  assert.equal(publicJob(emailJob).application_email, 'jobs@company.com');
  assert.equal(publicJob(emailJob).source_apply_url, null);
});
