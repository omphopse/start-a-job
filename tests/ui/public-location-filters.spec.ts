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
  await form.getByLabel('State', { exact: true }).selectOption('');
  await expect(form.getByLabel('City', { exact: true })).toBeDisabled();
  expect(externalRequests).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('location controls wrap, support keyboards and offer remote jobs at all required widths', async ({
  page,
}) => {
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/jobs');
    await expect(page.locator('.results-toolbar')).toBeVisible();
    const mobile = await page.locator('.mobile-filters').isVisible();
    if (mobile) await page.locator('.mobile-filters summary').click();
    const form = page.locator(
      mobile ? '.mobile-filters .filters-form' : '.desktop-filters .filters-form',
    );
    const state = form.getByLabel('State', { exact: true });
    await state.focus();
    await expect(state).toBeFocused();
    const box = await state.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    await expect(form.locator('option[value=remote]')).toHaveText('Remote / anywhere (1)');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (width === 390)
      await page.screenshot({ path: 'test-results/location-filters-390.png', fullPage: true });
  }
  await page.goto('/jobs?work_mode=remote');
  await expect(page.locator('.job-card')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Customer Experience Executive' })).toBeVisible();
});

test('unknown locations, aliases and retired API parameters are safe and have consistent SEO', async ({
  page,
  request,
}) => {
  const legacy = await request.get(
    '/api/public/jobs.json?qualification=anything&experience_level=malformed',
  );
  expect(legacy.status()).toBe(200);
  expect((await legacy.json()).total).toBe(10);
  const aliased = await request.get(
    '/api/public/jobs.json?country=india&state=karnataka&city=Bangalore',
  );
  expect(aliased.status()).toBe(200);
  expect((await aliased.json()).total).toBe(1);
  for (const parameter of ['country', 'state', 'city']) {
    const invalid = await request.get(
      `/api/public/jobs.json?${parameter}=${encodeURIComponent("'; drop table jobs;--")}`,
    );
    expect(invalid.status()).toBe(400);
  }
  await page.goto('/jobs?city=Atlantis');
  await expect(page.getByRole('heading', { name: 'No matches just yet.' })).toBeVisible();
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', 'noindex, follow');
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', /\/jobs$/);
  await expect(page.locator('.empty-state').getByRole('link', { name: 'Reset all' })).toBeVisible();
  await page.goto('/jobs?state=karnataka&city=Bangalore');
  await expect(page.locator('.job-card')).toHaveCount(1);
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute(
    'href',
    /state=Karnataka&city=Bengaluru/,
  );
  await page.goto('/jobs/location/bangalore?qualification=anything&experience_level=invalid');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Fresher jobs in Bengaluru');
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute(
    'href',
    /\/jobs\/location\/bengaluru$/,
  );
  await page.goto('/jobs?country=India&state=Karnataka&city=Bengaluru');
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', 'noindex, follow');
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', /\/jobs$/);
});
