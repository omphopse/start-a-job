import { test, expect } from '@playwright/test';
test('read-only dashboard and job form fit each viewport', async ({ page }, info) => {
  await page.goto('/demo/dashboard');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Good opportunities start here.',
  );
  await page.screenshot({
    path: `screenshots/dashboard-${info.project.name}.png`,
    fullPage: true,
    caret: 'initial',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/demo/job-form');
  await expect(page.getByLabel('Job title', { exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Generate summary with AI' })).toHaveCount(0);
  await expect(page.getByLabel('Paste notice')).toHaveCount(0);
  for (const name of ['eligibility', 'documents_needed', 'how_to_apply', 'last_date', 'vacancies'])
    await expect(page.locator(`[name="${name}"]`)).not.toHaveAttribute('required');
  await expect(page.getByLabel('Summary / full details')).toHaveAttribute('required', '');
  await expect(page.locator('select[name=experience_level] option[value="6-9"]')).toHaveCount(1);
  await expect(page.locator('select[name=category]')).toContainText('Cybersecurity');
  await page.getByText('Add a new category', { exact: true }).click();
  await expect(page.getByRole('button', { name: 'Add category', exact: true })).toBeDisabled();
  await page.screenshot({
    path: `screenshots/job-form-${info.project.name}.png`,
    fullPage: true,
    caret: 'initial',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('job fields survive a server validation error and form reset', async ({ page }) => {
  await page.goto('/demo/job-form');
  await page.waitForFunction(() => {
    const fieldset = document.querySelector('fieldset');
    return fieldset && Object.keys(fieldset).some((key) => key.startsWith('__reactFiber'));
  });
  // Enable the read-only preview only in this browser; mock the action, never write to a database.
  await page.locator('fieldset').evaluate((element) => element.removeAttribute('disabled'));
  await page.getByLabel('Job title', { exact: true }).fill('My unsaved job');
  await page.getByLabel('Application URL or Email').fill('http://localhost:3000/admin/jobs/new');
  await page.getByLabel('Summary / full details').fill('Short summary');
  await page.getByLabel('work mode').selectOption('hybrid');
  for (const checkbox of await page.getByRole('checkbox').all()) await checkbox.check();
  await page.route('**/demo/job-form', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    await route.fulfill({
      status: 200,
      contentType: 'text/x-component',
      body: '0:{"a":"$@1","f":[],"b":"development"}\n1:{"message":"application: Enter an official HTTPS URL or valid email. summary: Enter at least 50 characters."}\n',
    });
  });
  await page.locator('form.job-form').evaluate((form: HTMLFormElement) => {
    form.noValidate = true;
  });
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.locator('form.job-form').getByRole('alert')).toContainText('application');
  await expect(page.getByLabel('Job title', { exact: true })).toHaveValue('My unsaved job');
  await expect(page.getByLabel('Application URL or Email')).toHaveValue(
    'http://localhost:3000/admin/jobs/new',
  );
  await expect(page.getByLabel('Summary / full details')).toHaveValue('Short summary');
  await expect(page.getByLabel('work mode')).toHaveValue('hybrid');
  for (const checkbox of await page.getByRole('checkbox').all())
    await expect(checkbox).toBeChecked();
});

test('empty optional sections are hidden on the public job page', async ({ page }) => {
  await page.goto('/jobs/public-office-assistant-sample-public-office-jaipur-s10');
  await expect(
    page.getByRole('heading', { name: 'Public Office Assistant', exact: true }),
  ).toBeVisible();
  for (const heading of ['Eligibility', 'Documents needed', 'How to apply', 'Before you apply'])
    await expect(page.getByRole('heading', { name: heading, exact: true })).toHaveCount(0);
  await expect(page.locator('.last-date')).toHaveCount(0);
  await expect(page.locator('dt').filter({ hasText: 'Vacancies' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'About this opportunity' })).toBeVisible();
});
