import { test, expect } from '@playwright/test';

test('API-backed locations cascade, clear dependent selections, and allow blank city and state', async ({
  page,
}) => {
  await page.route('**/api/locations?*', async (route) => {
    const params = new URL(route.request().url()).searchParams;
    const options =
      params.get('kind') === 'countries'
        ? ['India', 'Canada']
        : params.get('kind') === 'states'
          ? params.get('country') === 'India'
            ? ['Maharashtra', 'Karnataka']
            : ['Ontario']
          : params.get('country') === 'Canada'
            ? ['Toronto']
            : params.get('state') === 'Karnataka'
              ? ['Bengaluru']
              : ['Mumbai', 'Pune'];
    await route.fulfill({ json: { options } });
  });
  await page.goto('/demo/job-form');
  await page.waitForFunction(() => {
    const fieldset = document.querySelector('form.job-form fieldset');
    return fieldset && Object.keys(fieldset).some((key) => key.startsWith('__reactFiber'));
  });
  await page
    .locator('form.job-form fieldset')
    .evaluate((element) => element.removeAttribute('disabled'));
  const country = page.getByRole('combobox', { name: 'Country', exact: true });
  const state = page.getByRole('combobox', { name: 'State (optional)', exact: true });
  const city = page.getByRole('combobox', { name: 'City (optional)', exact: true });
  await expect(country).toHaveValue('India');
  await expect(state.locator('option')).toHaveCount(3);
  await state.selectOption('Maharashtra');
  await expect(city.locator('option')).toHaveCount(3);
  await city.selectOption('Pune');
  await state.selectOption('Karnataka');
  await expect(city).toHaveValue('');
  await expect(city.locator('option')).toHaveCount(2);
  await city.selectOption('Bengaluru');
  await country.selectOption('Canada');
  await expect(state).toHaveValue('');
  await expect(city).toHaveValue('');
  await expect(state.locator('option')).toHaveCount(2);
  await expect(city.locator('option')).toHaveCount(2);
  // A city can also be selected without specifying a state.
  await city.selectOption('Toronto');
  await expect(state).toHaveValue('');
  await city.selectOption('');
  await expect(state).not.toHaveAttribute('required');
  await expect(city).not.toHaveAttribute('required');
  expect(
    await page.locator('form.job-form').evaluate((form: HTMLFormElement) => {
      const data = new FormData(form);
      return [data.get('country'), data.get('state'), data.get('location')];
    }),
  ).toEqual(['Canada', '', '']);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('failed location requests can be retried without blocking optional fields', async ({
  page,
}) => {
  let unavailable = true;
  await page.route('**/api/locations?*', (route) =>
    route.fulfill(
      unavailable
        ? { status: 502, json: { error: 'Unavailable' } }
        : { json: { options: ['India'] } },
    ),
  );
  await page.goto('/demo/job-form');
  await page.waitForFunction(() => {
    const fieldset = document.querySelector('form.job-form fieldset');
    return fieldset && Object.keys(fieldset).some((key) => key.startsWith('__reactFiber'));
  });
  await page
    .locator('form.job-form fieldset')
    .evaluate((element) => element.removeAttribute('disabled'));
  await expect(page.getByRole('combobox', { name: 'Country', exact: true })).toHaveValue('India');
  await expect(page.getByRole('button', { name: 'Retry country', exact: true })).toBeVisible();
  unavailable = false;
  await page.getByRole('button', { name: 'Retry country', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retry country', exact: true })).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'State (optional)', exact: true })).toHaveValue(
    'Karnataka',
  );
  await expect(page.getByRole('combobox', { name: 'City (optional)', exact: true })).toHaveValue(
    'Bengaluru',
  );
  await page.getByRole('combobox', { name: 'State (optional)', exact: true }).selectOption('');
  await expect(page.getByRole('combobox', { name: 'City (optional)', exact: true })).toHaveValue(
    '',
  );
});
