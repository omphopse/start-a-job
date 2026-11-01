import { test, expect } from '@playwright/test';

test('expired published jobs disappear from discovery but retain a friendly detail by slug', async ({
  page,
  request,
}) => {
  for (const path of [
    '/jobs',
    '/jobs?q=Expired',
    '/api/public/jobs.json?limit=100',
    '/feed.xml',
    '/sitemaps/jobs.xml',
  ]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    expect(await response.text(), path).not.toContain('expired-sample-job');
  }
  const response = await page.goto('/jobs/expired-sample-job');
  expect(response!.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'This job has expired' })).toBeVisible();
  await expect(page.locator('.similar-jobs .job-card').first()).toBeVisible();
  await expect(page.locator('.similar-jobs')).not.toContainText('Expired sample vacancy');
  await expect(page.locator('.apply-panel, .email-apply-panel, .mobile-apply')).toHaveCount(0);
  expect(await page.content()).not.toContain('"@type":"JobPosting"');
  expect((await request.get('/jobs/unknown-regression-slug')).status()).toBe(404);
  expect((await request.get('/jobs/deleted-sample-job')).status()).toBe(410);
});

test('dashboard exposes Expired badge/filter and form warns about past deadlines', async ({
  page,
}) => {
  await page.goto('/demo/dashboard');
  await page.getByLabel('Filter jobs by status').selectOption('expired');
  await expect(page.locator('.dashboard-job')).toHaveCount(1);
  await expect(page.locator('.expired-badge')).toHaveText('Expired');
  await page.goto('/demo/job-form');
  await page.waitForFunction(() =>
    Object.keys(document.querySelector('form.job-form fieldset')!).some((key) =>
      key.startsWith('__reactFiber'),
    ),
  );
  await page.locator('form.job-form fieldset').evaluate((el) => el.removeAttribute('disabled'));
  const date = page.getByLabel('Last date (optional)');
  await date.fill('2000-01-01');
  await expect(
    page.getByText('Warning: this closing date is in the past.', { exact: false }),
  ).toBeVisible();
  await date.fill('');
  await expect(
    page.getByText('If left empty, the closing date defaults to', { exact: false }),
  ).toBeVisible();
});
