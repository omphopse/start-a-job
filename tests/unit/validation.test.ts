import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jobInput, makeSlug, parseFilters } from '../../lib/validation';
import { sampleJobs } from '../../lib/sample-jobs';
test('job inputs reject unsafe URLs and missing safety confirmations', () => {
  const input = { ...sampleJobs[0], official_confirmed: 'on', no_fees: 'on' };
  assert.ok(jobInput.safeParse(input).success);
  for (const apply_url of [
    'http://company.com',
    'https://wa.me/123',
    'https://bit.ly/test',
    'https://user:pass@company.com',
    'https://127.0.0.1/x',
  ])
    assert.equal(jobInput.safeParse({ ...input, apply_url }).success, false);
  assert.equal(jobInput.safeParse({ ...input, no_fees: '' }).success, false);
});
test('slug is lowercase and includes role, company, city, short id', () =>
  assert.equal(
    makeSlug('Accounts Assistant', 'Acme', 'Pune', 'abcd1234-foo'),
    'accounts-assistant-acme-pune-abcd1234',
  ));
test('public filter validation handles duplicate/oversized inputs', () => {
  assert.equal(parseFilters({ q: ['one', 'two'] }).q, undefined);
  assert.equal(parseFilters({ q: 'x'.repeat(1000) }).q, undefined);
  assert.equal(parseFilters({ page: '-1' }).page, undefined);
  assert.equal(parseFilters({ category: 'Accounts', unknown: 'secret' }).category, 'Accounts');
});

test('optional job fields accept blanks; expanded experience and custom category are valid', () => {
  const input = {
    ...sampleJobs[0],
    vacancies: '',
    last_date: '',
    eligibility: '',
    documents_needed: '',
    how_to_apply: '',
    experience_level: '6-9',
    category: 'Quantum Computing',
    official_confirmed: 'on',
    no_fees: 'on',
  };
  const result = jobInput.parse(input);
  assert.equal(result.vacancies, null);
  assert.equal(result.last_date, null);
  assert.equal(result.eligibility, '');
  assert.equal(jobInput.safeParse({ ...input, summary: '' }).success, false);
  assert.equal(jobInput.safeParse({ ...input, vacancies: '0' }).success, false);
  assert.equal(parseFilters({ experience_level: '15+' }).experience_level, '15+');
});
