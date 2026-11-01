import { test, expect } from '@playwright/test';
test('original-summary confirmation and short attributed feed content are visible', async ({
  page,
  request,
}) => {
  await page.goto('/demo/job-form');
  await expect(
    page.getByText("Write the summary in your own words. Do not paste the employer's text."),
  ).toBeVisible();
  await expect(page.getByLabel('I wrote this summary in my own words')).toHaveAttribute(
    'required',
    '',
  );
  const feed = await (await request.get('/feed.xml')).text();
  const descriptions = [
    ...feed.matchAll(/<item>[\s\S]*?<description>([\s\S]*?)<\/description>/g),
  ].map((match) => match[1]);
  expect(descriptions.length).toBeGreaterThan(0);
  for (const description of descriptions) {
    const [excerpt, link] = description.split('\nRead more: ');
    expect(excerpt.length).toBeLessThanOrEqual(300);
    expect(link).toContain('/jobs/');
  }
  expect((await (await request.get('/openapi.json')).json()).info.description).toContain(
    'canonical_url',
  );
  expect(await (await request.get('/llms.txt')).text()).toContain('canonical_url');
});
