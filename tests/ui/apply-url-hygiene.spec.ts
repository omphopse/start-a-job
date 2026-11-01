import { test, expect } from '@playwright/test';
test('poster sees cleaned application URL and nonblocking aggregator advice', async ({ page }) => {
  await page.goto('/demo/job-form');
  await page.waitForFunction(() =>
    Object.keys(document.querySelector('form.job-form fieldset')!).some((key) =>
      key.startsWith('__reactFiber'),
    ),
  );
  await page.locator('form.job-form fieldset').evaluate((el) => el.removeAttribute('disabled'));
  const input = page.getByLabel('Application URL or Email');
  await input.fill('https://www.linkedin.com/jobs/view/123?utm_source=mail&jobId=123');
  await expect(page.locator('.application-cleaned')).toContainText(
    'https://www.linkedin.com/jobs/view/123?jobId=123',
  );
  await expect(page.locator('.application-cleaned')).not.toContainText('utm_source');
  await expect(page.locator('.application-cleaned')).toContainText('official careers page');
  expect(await input.evaluate((el: HTMLInputElement) => el.checkValidity())).toBe(true);
});
