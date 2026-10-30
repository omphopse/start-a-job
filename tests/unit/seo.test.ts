import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sampleJobs } from '../../lib/sample-jobs';
import { jobSchema, escapeHtml } from '../../lib/seo/schema';
test('JobPosting exactly matches visible job fields and excludes invented salary', () => {
  for (const j of sampleJobs) {
    const schema = jobSchema(j);
    assert.equal(schema.title, j.title);
    assert.equal(schema.hiringOrganization.name, j.company_name);
    assert.equal(schema.jobLocation.address.addressLocality, j.location);
    assert.equal(schema.validThrough, `${j.last_date}T23:59:59+05:30`);
    for (const field of ['summary', 'eligibility', 'documents_needed', 'how_to_apply'] as const)
      assert.ok(schema.description.includes(escapeHtml(j[field])));
    assert.equal('baseSalary' in schema, false);
    assert.equal(schema.directApply, false);
  }
});
