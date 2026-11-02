import { test, expect } from '@playwright/test';

test('public database locations cascade with counts, restore URLs and survive provider outage', async ({
  page,
}) => {
  let externalRequests = 0;
  await page.route('**/countriesnow.space/**', (route) => {
    externalRequests++;
    return route.abort();
  });
  await page.route('**/api/locations?*', (route) =>
    route.fulfill({ status: 502, json: { error: 'Offline' } }),
  );
  await page.goto('/jobs');
  await expect(page.locator('.results-toolbar')).toBeVisible();
  const mobile = await page.locator('.mobile-filters').isVisible();
  if (mobile) await page.locator('.mobile-filters summary').click();
  const form = page.locator(
    mobile ? '.mobile-filters .filters-form' : '.desktop-filters .filters-form',
  );
  await expect(form.locator('select[name=country]')).toHaveCount(0);
  await expect(form.getByLabel('City', { exact: true })).toBeDisabled();
  await expect(
    form.getByLabel('State', { exact: true }).locator('option[value=Maharashtra]'),
  ).toHaveText('Maharashtra (2)');
  await form.getByLabel('State', { exact: true }).selectOption('Maharashtra');
  await expect(form.getByLabel('City', { exact: true }).locator('option')).toHaveText([
    'All cities',
    'Mumbai (1)',
    'Pune (1)',
  ]);
  await form.getByLabel('City', { exact: true }).selectOption('Pune');
  await form.getByRole('button', { name: 'Apply filters' }).click();
  await expect(page).toHaveURL(/state=Maharashtra.*city=Pune/);
  await expect(page.locator('.job-card')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Junior Accounts Assistant' })).toBeVisible();
  await page.reload();
  if (mobile) await page.locator('.mobile-filters summary').click();
  await expect(form.getByLabel('State', { exact: true })).toHaveValue('Maharashtra');
  await expect(form.getByLabel('City', { exact: true })).toHaveValue('Pune');
  await form.getByLabel('State', { exact: true }).selectOption('Karnataka');
  await expect(form.getByLabel('City', { exact: true })).toHaveValue('');
  expect(externalRequests).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
