import { test, expect } from '@playwright/test';

test('click endpoint rejects cross-origin requests before logging', async ({ request }) => {
  const response = await request.post('/api/apply-click', {
    headers: { Origin: 'https://attacker.example' },
    data: { job_id: '00000000-0000-4000-8000-111111111111' },
  });
  expect(response.status()).toBe(403);
});
