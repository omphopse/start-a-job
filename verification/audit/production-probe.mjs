import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const base = 'http://localhost:3400';
const output = { headers: {}, locationAPI: [], timer: {} };
const home = await fetch(base);
for (const name of ['content-security-policy','strict-transport-security','x-content-type-options','referrer-policy','permissions-policy','x-frame-options']) output.headers[name] = home.headers.get(name);
assert.ok(output.headers['content-security-policy'].includes("object-src 'none'"));
assert.equal(output.headers['strict-transport-security'], 'max-age=31536000');
for (const path of ['kind=countries','kind=states&country=India','kind=cities&country=India&state=Maharashtra']) {
  const response = await fetch(`${base}/api/locations?${path}`);
  const body = await response.json();
  output.locationAPI.push({ query:path,status:response.status,options:body.options?.length });
  assert.equal(response.status,200);
  assert.ok(body.options.length > 0);
}
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport:{width:390,height:844} });
  await page.clock.install();
  await page.goto(base+'/jobs/email-application-sample-job');
  await expect(page.getByRole('button',{name:/Send Application.*10s/})).toBeDisabled();
  await page.clock.fastForward(9000);
  await expect(page.locator('.apply-panel a[href^="mailto:"]')).toHaveCount(0);
  await page.clock.fastForward(1000);
  await expect(page.getByRole('link',{name:'Send Application',exact:true})).toBeVisible();
  output.timer.email10seconds = true;
  await page.goto(base+'/jobs/customer-support-associate-northstar-services-bengaluru-s1');
  const main=page.locator('.apply-panel .apply-link');
  const sticky=page.locator('.mobile-apply .apply-link');
  await expect(main).toHaveAttribute('aria-disabled','true');
  await page.clock.fastForward(9000);
  await expect(main).toHaveAttribute('aria-disabled','true');
  await expect(sticky).toHaveAttribute('aria-disabled','true');
  await page.clock.fastForward(1000);
  await expect(main).toHaveAttribute('aria-disabled','false');
  await expect(sticky).toHaveAttribute('aria-disabled','false');
  output.timer.website10seconds = true;
} finally {
  await browser.close();
  await writeFile('verification/audit/production-probe.json',JSON.stringify(output,null,2));
}
console.log(JSON.stringify(output,null,2));
