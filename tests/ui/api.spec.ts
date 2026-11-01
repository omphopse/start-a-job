import { site } from '../../lib/config';
import { test, expect } from '@playwright/test';

test('API page caps and long location filters never fall back to unfiltered first-page data', async ({
  request,
}) => {
  const first = await (await request.get('/api/public/jobs.json?limit=5')).json();
  const second = await (await request.get('/api/public/jobs.json?limit=5&page=2')).json();
  expect(first.jobs).toHaveLength(5);
  expect(second.jobs).toHaveLength(5);
  const firstIds = new Set(first.jobs.map((job: { id: string }) => job.id));
  expect(second.jobs.every((job: { id: string }) => !firstIds.has(job.id))).toBe(true);
  const last = await request.get('/api/public/jobs.json?page=10000');
  expect(last.status()).toBe(200);
  expect((await last.json()).jobs).toEqual([]);
  const longState = await request.get(`/api/public/jobs.json?state=${'X'.repeat(100)}`);
  expect(longState.status()).toBe(200);
  expect((await longState.json()).jobs).toEqual([]);
  expect((await request.get('/api/public/jobs.json?page=10001')).status()).toBe(400);
});
test('public API and discovery feeds expose current public fields only', async ({ request }) => {
  const response = await request.get('/api/public/jobs.json?limit=5');
  expect(response.status()).toBe(200);
  expect(response.headers()['access-control-allow-origin']).toBe('*');
  const body = await response.json();
  expect(body.jobs).toHaveLength(5);
  expect(body.attribution).toBe(`Source: ${site.name}`);
  expect(body.jobs[0]).not.toHaveProperty('created_by');
  const job = await request.get(`/api/public/jobs/${body.jobs[0].slug}.json`);
  expect(job.status()).toBe(200);
  expect((await request.get('/api/public/jobs/expired-sample-job.json')).status()).toBe(404);
  expect((await request.get('/api/public/jobs.json?limit=101')).status()).toBe(400);
  expect((await request.post('/api/public/jobs.json', { data: {} })).status()).toBe(405);
  for (const route of ['/feed.xml', '/openapi.json', '/llms.txt'])
    expect((await request.get(route)).status()).toBe(200);
});
