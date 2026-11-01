import { test, expect } from '@playwright/test';

test('responses include baseline CSP and transport security headers', async ({ request }) => {
  const response = await request.get('/');
  const headers = response.headers();
  expect(headers['content-security-policy']).toContain("object-src 'none'");
  expect(headers['content-security-policy']).toContain("base-uri 'self'");
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['content-security-policy']).toContain("form-action 'self'");
  expect(headers['strict-transport-security']).toBe('max-age=31536000');
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['permissions-policy']).toContain('camera=()');
});

test('click endpoint rejects cross-origin requests before logging', async ({ request }) => {
  const response = await request.post('/api/apply-click', {
    headers: { Origin: 'https://attacker.example' },
    data: { job_id: '00000000-0000-4000-8000-111111111111' },
  });
  expect(response.status()).toBe(403);
});
