import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { applicationUrl } from '../../lib/application-method';
import { JobCard } from '../../components/job-card';
import { JsonLd } from '../../components/json-ld';
import { jobSchema } from '../../lib/seo/schema';
import { sampleJobs } from '../../lib/sample-jobs';
import { writeFileSync } from 'node:fs';
const rejected = [
  'javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<script>alert(1)</script>',
  'http://company.com/jobs', '//company.com/jobs', 'ftp://company.com/jobs',
  'https://user:pass@company.com/jobs', 'https://user@company.com/jobs',
  'https://company.com:8443/jobs', 'https://127.0.0.1/jobs', 'https://2130706433/jobs',
  'https://0x7f000001/jobs', 'https://[::1]/jobs', 'https://localhost/jobs',
  'https://server.local/jobs', 'https://bit.ly/jobs', 'https://sub.bit.ly/jobs',
  'https://tinyurl.com/jobs', 'https://wa.me/123', 'https://t.me/job',
  'https://telegram.me/jobs', 'https://whatsapp.com/jobs', 'https:\\company.com/jobs',
  'https://company.com/a b', 'https://company.com/\nfoo', 'https://company.com/\u0000foo',
];
const outcomes = rejected.map((value) => {
  try { return { value: JSON.stringify(value), rejected: !applicationUrl.safeParse(value).success, threw: false }; }
  catch { return { value: JSON.stringify(value), rejected: false, threw: true }; }
});
for (const value of ['https://company.com/jobs', ' HTTPS://company.com/jobs ', 'https://company.com/jobs?q=engineer&level=1']) assert.ok(applicationUrl.safeParse(value).success);
const payload = '</script><img src=x onerror=alert(1)><script>alert(1)</script>';
const strings = ['title','company_name','location','state','qualification','salary_text','summary','eligibility','documents_needed','how_to_apply'] as const;
for (const field of strings) {
  const job = { ...sampleJobs[0], [field]: payload };
  const markup = renderToStaticMarkup(createElement(JobCard, { job }));
  assert.ok(!markup.includes('<img src=x'));
  const schema = renderToStaticMarkup(createElement(JsonLd, { data: jobSchema(job) }));
  assert.equal((schema.match(/<script/g) || []).length, 1);
  assert.equal((schema.match(/<\/script>/g) || []).length, 1);
  assert.ok(!schema.includes('<img src=x'));
}
const output = { rejectedURLCases: outcomes, validURLCases: 3, xssFields: strings, result: 'PASS bounded renderer/schema checks; not full live persisted-field XSS coverage' };
writeFileSync('verification/audit/input-probe.json', JSON.stringify(output, null, 2));
console.log(JSON.stringify(output, null, 2));
assert.ok(outcomes.every((value) => value.rejected && !value.threw));
