import lighthouse from 'lighthouse';
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.SEO_BASE_URL || 'http://localhost:3000';
await mkdir('verification', { recursive: true });
const api = await (await fetch(base + '/api/public/jobs.json?limit=1')).json();
if (!api.jobs?.length) throw new Error('Publish a staging job or enable demo mode first.');
const browser = await chromium.launch({ headless: true, args: ['--remote-debugging-port=9223'] });
try {
  const scores = [];
  for (const [name, path] of [
    ['home', '/'],
    ['listing', '/jobs'],
    ['job', '/jobs/' + api.jobs[0].slug],
  ]) {
    const result = await lighthouse(base + path, {
      port: 9223,
      output: ['json', 'html'],
      logLevel: 'error',
      onlyCategories: ['performance', 'accessibility', 'seo'],
      formFactor: 'mobile',
      screenEmulation: {
        mobile: true,
        width: 390,
        height: 844,
        deviceScaleFactor: 1,
        disabled: false,
      },
    });
    await writeFile(`verification/lighthouse-${name}.json`, result.report[0]);
    await writeFile(`verification/lighthouse-${name}.html`, result.report[1]);
    scores.push({
      page: name,
      ...Object.fromEntries(
        Object.entries(result.lhr.categories).map(([key, value]) => [
          key,
          Math.round(value.score * 100),
        ]),
      ),
      LCP: result.lhr.audits['largest-contentful-paint'].numericValue,
      CLS: result.lhr.audits['cumulative-layout-shift'].numericValue,
    });
  }
  await writeFile('verification/lighthouse-scores.json', JSON.stringify(scores, null, 2));
  console.log(JSON.stringify(scores, null, 2));
} finally {
  await browser.close();
}
