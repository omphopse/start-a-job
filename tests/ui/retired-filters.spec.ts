import { test, expect } from '@playwright/test';
test('legacy filter links show normal results and omit retired parameters from canonical', async ({
  page,
}) => {
  await page.goto('/jobs?qualification=Any+graduate&experience_level=invalid');
  await expect(
    page.locator('select[name="qualification"],select[name="experience_level"]'),
  ).toHaveCount(0);
  await expect(page.locator('.job-card').first()).toBeVisible();
  const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
  expect(canonical).not.toMatch(/qualification|experience_level/);
});
