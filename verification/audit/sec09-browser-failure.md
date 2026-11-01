# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: locations.spec.ts >> API-backed locations cascade, clear dependent selections, and allow blank city and state
- Location: tests\ui\locations.spec.ts:3:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForFunction: Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic:
  - generic [active]:
    - generic [ref=e3]:
      - generic [ref=e4]:
        - navigation [ref=e6]:
          - button [disabled] [ref=e7]:
            - img "previous" [ref=e8]
          - generic [ref=e10]:
            - generic [ref=e11]: 1/
            - generic [ref=e12]: "1"
          - button [disabled] [ref=e13]:
            - img "next" [ref=e14]
        - generic [ref=e17]:
          - generic "Latest available version is detected (16.4.3)." [ref=e20]: Next.js 16.4.3
          - generic [ref=e21]: Turbopack
      - dialog "Runtime SyntaxError" [ref=e23]:
        - generic [ref=e26]:
          - generic [ref=e28]:
            - generic [ref=e29]:
              - generic [ref=e30]: Runtime SyntaxError
              - generic [ref=e32]:
                - button "Copy Error Info" [ref=e33] [cursor=pointer]
                - button "No related documentation found" [disabled] [ref=e36]
                - button "Attach Node.js inspector" [ref=e39] [cursor=pointer]
            - generic [ref=e48]: Unexpected end of JSON input
          - generic [ref=e51]:
            - generic [ref=e52]:
              - paragraph [ref=e53]:
                - text: Call Stack
                - generic [ref=e54]: "21"
              - button "Show 20 ignore-listed frame(s)" [ref=e55] [cursor=pointer]
            - generic [ref=e58]:
              - generic [ref=e59]: JSON.parse
              - text: <anonymous>
    - generic [ref=e65] [cursor=pointer]:
      - button "Open issues overlay" [ref=e66]:
        - generic [ref=e70]:
          - generic [aria-hidden] [ref=e71]: "0"
          - generic [ref=e72]: "1"
        - generic [ref=e73]: Issue
      - button "Collapse issues badge" [ref=e74]
  - alert [ref=e77]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('API-backed locations cascade, clear dependent selections, and allow blank city and state', async ({
  4  |   page,
  5  | }) => {
  6  |   await page.route('**/api/locations?*', async (route) => {
  7  |     const params = new URL(route.request().url()).searchParams;
  8  |     const options =
  9  |       params.get('kind') === 'countries'
  10 |         ? ['India', 'Canada']
  11 |         : params.get('kind') === 'states'
  12 |           ? params.get('country') === 'India'
  13 |             ? ['Maharashtra', 'Karnataka']
  14 |             : ['Ontario']
  15 |           : params.get('country') === 'Canada'
  16 |             ? ['Toronto']
  17 |             : params.get('state') === 'Karnataka'
  18 |               ? ['Bengaluru']
  19 |               : ['Mumbai', 'Pune'];
  20 |     await route.fulfill({ json: { options } });
  21 |   });
  22 |   await page.goto('/demo/job-form');
> 23 |   await page.waitForFunction(() => {
     |              ^ Error: page.waitForFunction: Test timeout of 30000ms exceeded.
  24 |     const fieldset = document.querySelector('form.job-form fieldset');
  25 |     return fieldset && Object.keys(fieldset).some((key) => key.startsWith('__reactFiber'));
  26 |   });
  27 |   await page
  28 |     .locator('form.job-form fieldset')
  29 |     .evaluate((element) => element.removeAttribute('disabled'));
  30 |   const country = page.getByRole('combobox', { name: 'Country', exact: true });
  31 |   const state = page.getByRole('combobox', { name: 'State (optional)', exact: true });
  32 |   const city = page.getByRole('combobox', { name: 'City (optional)', exact: true });
  33 |   await expect(country).toHaveValue('India');
  34 |   await expect(state.locator('option')).toHaveCount(3);
  35 |   await state.selectOption('Maharashtra');
  36 |   await expect(city.locator('option')).toHaveCount(3);
  37 |   await city.selectOption('Pune');
  38 |   await state.selectOption('Karnataka');
  39 |   await expect(city).toHaveValue('');
  40 |   await expect(city.locator('option')).toHaveCount(2);
  41 |   await city.selectOption('Bengaluru');
  42 |   await country.selectOption('Canada');
  43 |   await expect(state).toHaveValue('');
  44 |   await expect(city).toHaveValue('');
  45 |   await expect(state.locator('option')).toHaveCount(2);
  46 |   await expect(city.locator('option')).toHaveCount(2);
  47 |   // A city can also be selected without specifying a state.
  48 |   await city.selectOption('Toronto');
  49 |   await expect(state).toHaveValue('');
  50 |   await city.selectOption('');
  51 |   await expect(state).not.toHaveAttribute('required');
  52 |   await expect(city).not.toHaveAttribute('required');
  53 |   expect(
  54 |     await page.locator('form.job-form').evaluate((form: HTMLFormElement) => {
  55 |       const data = new FormData(form);
  56 |       return [data.get('country'), data.get('state'), data.get('location')];
  57 |     }),
  58 |   ).toEqual(['Canada', '', '']);
  59 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  60 | });
  61 | 
  62 | test('failed location requests can be retried without blocking optional fields', async ({
  63 |   page,
  64 | }) => {
  65 |   let unavailable = true;
  66 |   await page.route('**/api/locations?*', (route) =>
  67 |     route.fulfill(
  68 |       unavailable
  69 |         ? { status: 502, json: { error: 'Unavailable' } }
  70 |         : { json: { options: ['India'] } },
  71 |     ),
  72 |   );
  73 |   await page.goto('/demo/job-form');
  74 |   await page.waitForFunction(() => {
  75 |     const fieldset = document.querySelector('form.job-form fieldset');
  76 |     return fieldset && Object.keys(fieldset).some((key) => key.startsWith('__reactFiber'));
  77 |   });
  78 |   await page
  79 |     .locator('form.job-form fieldset')
  80 |     .evaluate((element) => element.removeAttribute('disabled'));
  81 |   await expect(page.getByRole('combobox', { name: 'Country', exact: true })).toHaveValue('India');
  82 |   await expect(page.getByRole('button', { name: 'Retry country', exact: true })).toBeVisible();
  83 |   unavailable = false;
  84 |   await page.getByRole('button', { name: 'Retry country', exact: true }).click();
  85 |   await expect(page.getByRole('button', { name: 'Retry country', exact: true })).toHaveCount(0);
  86 |   await expect(page.getByRole('combobox', { name: 'State (optional)', exact: true })).toHaveValue(
  87 |     'Karnataka',
  88 |   );
  89 |   await expect(page.getByRole('combobox', { name: 'City (optional)', exact: true })).toHaveValue(
  90 |     'Bengaluru',
  91 |   );
  92 |   await page.getByRole('combobox', { name: 'State (optional)', exact: true }).selectOption('');
  93 |   await expect(page.getByRole('combobox', { name: 'City (optional)', exact: true })).toHaveValue(
  94 |     '',
  95 |   );
  96 | });
  97 | 
```