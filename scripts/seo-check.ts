import assert from 'node:assert/strict';
import { z } from 'zod';
const base = process.env.SEO_BASE_URL || 'http://localhost:3000';
const jobSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  title: z.string(),
  company: z.string(),
  location: z.string(),
  work_mode: z.string(),
  qualification: z.string(),
  experience_level: z.string(),
  salary_text: z.string(),
  last_date: z.string().nullable(),
  posted_at: z.string().nullable(),
  source_apply_url: z.url(),
  canonical_url: z.url(),
  summary: z.string(),
});
async function get(path: string) {
  const response = await fetch(new URL(path, base), {
    headers: { 'User-Agent': 'SEO-verification-no-JavaScript' },
  });
  assert.equal(response.status, 200, `${path} must return 200`);
  return response.text();
}
async function main() {
  const api = z
    .object({ attribution: z.string(), jobs: z.array(jobSchema) })
    .parse(JSON.parse(await get('/api/public/jobs.json?limit=5')));
  assert.ok(api.jobs.length >= 5, 'SEO check needs at least five published sample/staging jobs');
  for (const job of api.jobs) {
    const path = `/jobs/${job.slug}`;
    const html = await get(path);
    for (const text of [job.title, job.company, job.location, job.last_date, job.summary])
      if (text)
        assert.ok(
          html.includes(text.replaceAll('&', '&amp;')),
          `${path} missing ${text.slice(0, 35)} in no-JS HTML`,
        );
    assert.ok(
      html.includes(`href="${job.source_apply_url.replaceAll('&', '&amp;')}"`),
      'Real apply anchor missing',
    );
    assert.ok(html.includes('noopener noreferrer nofollow'));
    const json = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
      .map((m) => JSON.parse(m[1]))
      .find((s) => s['@type'] === 'JobPosting');
    assert.ok(json, 'JobPosting missing');
    for (const field of [
      'title',
      'description',
      'datePosted',
      'employmentType',
      'hiringOrganization',
      'jobLocation',
      'identifier',
      'url',
      'directApply',
    ])
      assert.ok(field in json, `${field} missing`);
    assert.equal(json.title, job.title);
    assert.equal(json.hiringOrganization.name, job.company);
    assert.equal(json.jobLocation.address.addressLocality, job.location);
    if (job.last_date) assert.ok(json.validThrough.startsWith(job.last_date));
    console.log(`PASS no-JS HTML + JSON-LD: ${path}`);
  }
  const robots = await get('/robots.txt');
  for (const bot of [
    'OAI-SearchBot',
    'ChatGPT-User',
    'Claude-SearchBot',
    'Claude-User',
    'PerplexityBot',
    'Googlebot',
    'Bingbot',
    'GPTBot',
    'ClaudeBot',
    'Google-Extended',
    'CCBot',
    'Applebot-Extended',
  ])
    assert.ok(robots.includes(`User-agent: ${bot}\n`), `Missing bot: ${bot}`);
  assert.ok(robots.includes('Disallow: /admin'));
  assert.ok(robots.includes('Disallow: /api/internal'));
  assert.ok(robots.includes('Sitemap:'));
  const seen = new Set<string>();
  async function checkMap(path: string) {
    if (seen.has(path)) return;
    seen.add(path);
    const xml = await get(path);
    for (const m of xml.matchAll(/<loc>(.*?)<\/loc>/g)) {
      const url = new URL(m[1].replaceAll('&amp;', '&'));
      const local = url.pathname + url.search;
      if (local.endsWith('.xml')) await checkMap(local);
      else await get(local);
    }
  }
  await checkMap('/sitemap.xml');
  console.log(
    `PASS all named bots, sitemap hierarchy (${seen.size} XML documents), sitemap URLs and jobs.json schema`,
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
