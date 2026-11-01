import assert from 'node:assert/strict';
import { applicationMailto } from '../application-method';

export function verifyApplicationHtml(
  job: { source_apply_url: string | null; application_email: string | null },
  html: string,
) {
  if (job.source_apply_url) {
    const href = job.source_apply_url.replaceAll('&', '&amp;').replaceAll("'", '&#x27;');
    assert.ok(html.includes(`href="${href}"`), 'Real apply anchor missing');
    assert.ok(html.includes('noopener noreferrer nofollow'));
    assert.ok(html.includes('target="_blank"'));
    return;
  }
  assert.ok(job.application_email, 'An application method is required');
  const emailHref = applicationMailto(job.application_email);
  assert.ok(
    !html.includes(`href="${emailHref}`),
    'Email must remain unavailable until its countdown ends',
  );
  assert.ok(html.includes('Apply via email'));
  assert.ok(html.includes('Application email countdown'));
  assert.match(html, /<button[^>]*disabled[^>]*>\s*Send Application/);
}

export function verifyLocationSchema(location: string, address: { addressLocality?: string }) {
  assert.equal(address.addressLocality, location || undefined);
}
