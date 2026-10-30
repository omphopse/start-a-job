import { test, expect } from '@playwright/test';
test('read-only dashboard and job form fit each viewport', async ({ page }, info) => {
  await page.goto('/demo/dashboard');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Good opportunities start here.',
  );
  await page.screenshot({
    path: `screenshots/dashboard-${info.project.name}.png`,
    fullPage: true,
    caret: 'initial',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/demo/job-form');
  await expect(page.getByLabel('Job title', { exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Generate summary with AI' })).toBeDisabled();
  await page.screenshot({
    path: `screenshots/job-form-${info.project.name}.png`,
    fullPage: true,
    caret: 'initial',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
