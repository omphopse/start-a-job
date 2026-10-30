import { test, expect } from '@playwright/test';
test('admin review and team previews are responsive; real routes protected', async ({
  page,
}, info) => {
  for (const view of ['review', 'users']) {
    await page.goto(`/demo/${view}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('fieldset')).toHaveAttribute('disabled', '');
    for (const button of await page.getByRole('main').getByRole('button').all())
      await expect(button).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `screenshots/${view}-${info.project.name}.png`,
      fullPage: true,
      caret: 'initial',
    });
  }
  await page.goto('/admin/jobs/new');
  await expect(page).toHaveURL(/\/admin\/login/);
});
