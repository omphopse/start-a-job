import { test, expect } from '@playwright/test';

test('email applications reveal the address and mail link after the configured countdown', async ({
  page,
  request,
}) => {
  const response = await request.get('/jobs/email-application-sample-job');
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain('Apply via email');
  expect(html).toContain('Send Application');
  expect(html).toContain('countdown-message');
  expect(html).not.toContain('href="mailto:');
  await page.clock.install();
  await page.goto('/jobs/email-application-sample-job');
  await expect(page.getByRole('heading', { name: 'Apply via email' })).toBeVisible();
  const address = page.getByRole('link', { name: 'Recruitment+jobs@example.com', exact: true });
  await expect(address).toHaveCount(0);
  await expect(page.locator('.apply-panel')).not.toContainText('Recruitment+jobs@example.com');
  const waiting = page.getByRole('button', { name: /Send Application/ });
  await expect(waiting).toBeDisabled();
  await expect(page.locator('.apply-panel a[href^="mailto:"]')).toHaveCount(0);
  await page.clock.fastForward(1000);
  await expect(waiting).toBeDisabled();
  await expect(address).toHaveCount(0);
  await page.clock.fastForward(1100);
  await expect(address).toHaveAttribute('href', 'mailto:Recruitment%2Bjobs@example.com');
  const send = page.getByRole('link', { name: 'Send Application', exact: true });
  await expect(send).toBeVisible();
  await expect(send).not.toHaveAttribute('aria-disabled');
  await expect(send).not.toHaveAttribute('target', '_blank');
  const href = await send.getAttribute('href');
  const params = new URLSearchParams(href!.split('?')[1]);
  expect(params.get('subject')).toBe(
    'Application for Customer Support Associate – Northstar Services (Sample)',
  );
  expect(params.has('body')).toBe(false);
  await expect(
    page.getByRole('progressbar', { name: 'Application email countdown' }),
  ).toHaveAttribute('value', '2');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('URL applications preserve the configured countdown and safe new-tab link', async ({
  page,
}) => {
  await page.clock.install();
  await page.goto('/jobs/customer-support-associate-northstar-services-bengaluru-s1');
  const apply = page.locator('.apply-panel a.apply-link');
  await expect(apply).toHaveAttribute('href', 'https://example.com/careers/sample-1');
  await expect(apply).toHaveAttribute('aria-disabled', 'true');
  await expect(apply).toHaveAttribute('target', '_blank');
  await expect(apply).toHaveAttribute('rel', 'noopener noreferrer nofollow');
  // The UI test configuration uses the existing two-second environment override.
  await page.clock.fastForward(2100);
  await expect(apply).toHaveAttribute('aria-disabled', 'false');
  await expect(page.getByRole('heading', { name: 'Apply via email' })).toHaveCount(0);
});

test('combined form input accepts an email without native URL-only validation', async ({
  page,
}) => {
  await page.goto('/demo/job-form');
  await page.waitForFunction(() => {
    const fieldset = document.querySelector('form.job-form fieldset');
    return fieldset && Object.keys(fieldset).some((key) => key.startsWith('__reactFiber'));
  });
  await page
    .locator('form.job-form fieldset')
    .evaluate((element) => element.removeAttribute('disabled'));
  const input = page.getByLabel('Application URL or Email');
  await expect(input).toHaveAttribute('type', 'text');
  await expect(input).toHaveAttribute('required', '');
  await expect(input).toHaveAttribute(
    'placeholder',
    'https://company.com/careers/job-123 or hr@company.com',
  );
  await input.fill('Recruitment+jobs@company.com');
  expect(await input.evaluate((element: HTMLInputElement) => element.checkValidity())).toBe(true);
  await expect(input).toHaveValue('Recruitment+jobs@company.com');
  await input.fill('https://company.com/careers/job-123');
  await expect(input).toHaveValue('https://company.com/careers/job-123');
});
