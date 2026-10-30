import { test, expect } from '@playwright/test';
test('admin routes require auth and login is accessible', async ({ page }, info) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  await page.screenshot({
    path: `screenshots/login-${info.project.name}.png`,
    fullPage: true,
    caret: 'initial',
  });
  await page.getByLabel('Email address').fill('poster@example.com');
  await page.getByRole('button', { name: 'Send sign-in code' }).click();
  await expect(page.getByRole('status')).toContainText('not configured');
  await page.goto('/admin/users');
  await expect(page).toHaveURL(/\/admin\/login/);
});
