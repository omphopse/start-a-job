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
  await expect(page.getByLabel('Six-digit code')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Verify code' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Send OTP' }).click();
  await expect(page.getByRole('status')).toContainText('not configured');
  await expect(page.getByLabel('Email address')).toHaveValue('poster@example.com');
  await expect(page.getByRole('button', { name: 'Send OTP' })).toBeVisible();
  await page.goto('/admin/users');
  await expect(page).toHaveURL(/\/admin\/login/);
});

test('OTP steps preserve email and offer explicit resend and change actions', async ({
  page,
}, info) => {
  // Mock only the action result: no OTP delivery or real account is involved.
  await page.route('**/admin/login', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    const response = await route.fetch();
    const body = await response.text();
    if (body.includes('Sign-in is not configured yet.')) {
      await route.fulfill({
        response,
        body: body
          .replace(
            'Sign-in is not configured yet. Connect Supabase using SETUP.md.',
            'Test code requested.',
          )
          .replace('"sent":false', '"sent":true'),
      });
    } else await route.fulfill({ response });
  });
  await page.goto('/admin/login');
  await page.getByLabel('Email address').fill('poster@example.com');
  await page.getByRole('button', { name: 'Send OTP', exact: false }).click();
  await expect(page.getByLabel('Six-digit code')).toBeVisible();
  await expect(page.getByLabel('Email address')).toHaveValue('poster@example.com');
  await expect(page.getByLabel('Email address')).toHaveAttribute('readonly', '');
  await page.getByRole('button', { name: 'Verify code' }).click();
  expect(
    await page
      .getByLabel('Six-digit code')
      .evaluate((input: HTMLInputElement) => input.validity.valueMissing),
  ).toBe(true);
  await expect(page.getByLabel('Six-digit code')).toBeFocused();
  await page.getByLabel('Six-digit code').fill('12');
  await page.getByRole('button', { name: 'Resend OTP', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Test code requested.');
  await page.screenshot({
    path: `screenshots/login-verify-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Change email address', exact: true }).click();
  await expect(page.getByLabel('Six-digit code')).toHaveCount(0);
  await expect(page.getByLabel('Email address')).toBeEditable();
  await expect(page.getByLabel('Email address')).toHaveValue('poster@example.com');
  await expect(page.getByRole('button', { name: 'Send OTP' })).toBeVisible();
});
