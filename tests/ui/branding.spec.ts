import { test, expect } from '@playwright/test';

test('startajob branding is consistent across public, authentication and admin preview pages', async ({
  page,
}) => {
  test.setTimeout(60_000);
  for (const path of [
    '/',
    '/jobs',
    '/about',
    '/contact',
    '/admin/login',
    '/demo/dashboard',
    '/jobs/customer-support-associate-northstar-services-bengaluru-s1',
  ]) {
    await page.goto(path);
    await expect(page.locator('header .brand')).toContainText('startajob');
    await expect(page.locator('header .brand-icon')).toHaveText('s.');
    await expect(page.locator('footer .brand')).toContainText('startajob');
    await expect(page.locator('meta[name="application-name"]')).toHaveAttribute(
      'content',
      'startajob',
    );
    expect(await page.locator('body').innerText()).not.toMatch(
      /\b(?:DeskJobs|deskjobs|DESKJOBS|Desk Jobs)\b/,
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.goto('/about');
  await expect(page).toHaveTitle('About startajob');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('About startajob');
  await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute(
    'content',
    'startajob',
  );
  await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
    'content',
    'About startajob',
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/about$/);
  await page.goto('/admin/login');
  await expect(page).toHaveTitle('Poster sign in | startajob');
  await expect(page.locator('.auth-story')).toContainText('startajob community.');
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login/);
});

test('public API, structured data and discovery metadata use the new brand', async ({
  request,
}) => {
  const [api, feed, llms, openapi, home] = await Promise.all([
    request.get('/api/public/jobs.json?limit=1'),
    request.get('/feed.xml'),
    request.get('/llms.txt'),
    request.get('/openapi.json'),
    request.get('/'),
  ]);
  expect((await api.json()).attribution).toBe('Source: startajob');
  expect(await feed.text()).toContain('<title>startajob</title>');
  expect(await llms.text()).toMatch(/^# startajob\n/);
  expect((await openapi.json()).info.title).toBe('startajob public jobs');
  const html = await home.text();
  expect(html).toContain('"name":"startajob"');
  expect(html).toContain('name="twitter:title" content="startajob');
});
