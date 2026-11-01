import { test, expect } from '@playwright/test';
test('trust pages, robots and structured data are server rendered', async ({
  page,
  request,
}, info) => {
  await page.goto('/about');
  await expect(page.getByRole('heading', { level: 1, name: 'About startajob' })).toBeVisible();
  await page.screenshot({
    path: `screenshots/about-${info.project.name}.png`,
    fullPage: true,
    caret: 'initial',
  });
  const robots = await (await request.get('/robots.txt')).text();
  for (const bot of [
    'OAI-SearchBot',
    'ChatGPT-User',
    'Claude-SearchBot',
    'Claude-User',
    'PerplexityBot',
    'Googlebot',
    'Bingbot',
    'GPTBot',
    'ClaudeBot',
    'Google-Extended',
    'CCBot',
    'Applebot-Extended',
  ])
    expect(robots).toContain(`User-agent: ${bot}`);
  const index = await (await request.get('/sitemap.xml')).text();
  expect(index).toContain('sitemapindex');
  await page.goto('/jobs');
  const href = await page
    .getByRole('link', { name: 'Customer Support Associate', exact: false })
    .getAttribute('href');
  const html = await (await request.get(href!)).text();
  expect(html).toContain('JobPosting');
  expect(html).toContain('https://example.com/careers/sample-1');
  expect(await (await request.get('/jobs/expired-sample-job')).text()).not.toContain(
    '"@type":"JobPosting"',
  );
});
