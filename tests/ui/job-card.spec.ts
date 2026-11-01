import { test, expect } from '@playwright/test';

test('whole job cards are links across public layouts', async ({ page }) => {
  for (const path of [
    '/',
    '/jobs',
    '/jobs/category/customer-support',
    '/jobs/customer-support-associate-northstar-services-bengaluru-s1',
  ]) {
    await page.goto(path);
    const cards = page.locator('.job-card');
    await expect(cards.first()).toBeVisible();
    for (const card of await cards.all()) {
      await card.scrollIntoViewIfNeeded();
      expect(
        await card.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          const link = element.querySelector('a');
          return [
            [rect.left + 4, rect.top + 4],
            [rect.right - 4, rect.bottom - 4],
            [rect.left + rect.width / 2, rect.top + rect.height / 2],
          ].every(([x, y]) => document.elementFromPoint(x, y)?.closest('a') === link);
        }),
      ).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const card = cards.first();
    const href = await card.locator('a').getAttribute('href');
    await card.click({ position: { x: 5, y: 5 } });
    await expect(page).toHaveURL(new RegExp(`${href}$`));
  }
});

test('cards support keyboard navigation and long content without overflow', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const card = page.locator('.job-card').first();
  await card.locator('.company-name').evaluate((element) => {
    element.textContent = 'Company'.repeat(30);
  });
  await card.locator('h3 a').evaluate((element) => {
    element.prepend('LongJobTitle'.repeat(30));
  });
  await card
    .locator('.tag')
    .last()
    .evaluate((element) => {
      element.textContent = 'Qualification'.repeat(30);
    });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const link = card.locator('a');
  const href = await link.getAttribute('href');
  await link.focus();
  await expect(link).toBeFocused();
  await expect(card).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`${href}$`));
});
