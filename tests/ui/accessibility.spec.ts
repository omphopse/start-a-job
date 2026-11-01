import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { AxeResults } from 'axe-core';

test('public pages pass automated WCAG A and AA checks', async ({ page }) => {
  test.setTimeout(60_000);
  for (const path of [
    '/',
    '/jobs',
    '/jobs/customer-support-associate-northstar-services-bengaluru-s1',
    '/admin/login',
  ]) {
    await page.goto(path);
    await page.addScriptTag({ content: readFileSync('node_modules/axe-core/axe.min.js', 'utf8') });
    const violations = await page.evaluate(async () => {
      const engine = (
        window as typeof window & {
          axe: { run: (context: Document, options: unknown) => Promise<AxeResults> };
        }
      ).axe;
      const result = await engine.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
      });
      return result.violations.map(({ id, impact, nodes }) => ({
        id,
        impact,
        targets: nodes.map((node) => node.target),
      }));
    });
    expect(violations, path).toEqual([]);
  }
});

test('secondary controls provide 44px hit areas', async ({ page }) => {
  for (const path of [
    '/',
    '/jobs',
    '/jobs/customer-support-associate-northstar-services-bengaluru-s1',
  ]) {
    await page.goto(path);
    const small = await page
      .locator(
        'header nav a, footer a, .popular a, .sort-submit, .sort-label select, .breadcrumb a, .report-link a',
      )
      .evaluateAll((elements) =>
        elements.flatMap((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44)
            ? [{ text: element.textContent?.trim(), width: rect.width, height: rect.height }]
            : [];
        }),
      );
    expect(small, path).toEqual([]);
  }
});

test('mobile sticky apply shares countdown state and leaves final content visible', async ({
  page,
}) => {
  await page.clock.install();
  for (const width of [360, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/jobs/customer-support-associate-northstar-services-bengaluru-s1');
    const main = page.locator('.apply-panel .apply-link');
    const sticky = page.locator('.mobile-apply .apply-link');
    await expect(main).toHaveAttribute('aria-disabled', 'true');
    await expect(sticky).toHaveAttribute('aria-disabled', 'true');
    await page.clock.fastForward(2100);
    await expect(main).toHaveAttribute('aria-disabled', 'false');
    await expect(sticky).toHaveAttribute('aria-disabled', 'false');
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const clear = await page.evaluate(
      () =>
        document.querySelector('.footer-bottom')!.getBoundingClientRect().bottom <=
        document.querySelector('.mobile-apply')!.getBoundingClientRect().top,
    );
    expect(clear).toBe(true);
  }
});
