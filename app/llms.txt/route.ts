import { site } from '@/lib/config';
export function GET() {
  return new Response(
    `# ${site.name}\n\n${site.tagline}\n\nAn independent India-focused directory of fresher and entry-level desk jobs. Each job page contains eligibility, documents, application instructions, deadline and an official source link.\n\nWe link to official sources and never charge fees. Sample listings are fictional and explicitly labelled.\n\n- [Browse jobs](${site.url}/jobs)\n- [Jobs JSON](${site.url}/api/public/jobs.json)\n- [OpenAPI](${site.url}/openapi.json)\n- [Sitemap](${site.url}/sitemap.xml)\n- [Customer support](${site.url}/jobs/category/customer-support)\n- [Accounts](${site.url}/jobs/category/accounts)\n- [Privacy](${site.url}/privacy-policy)\n\nContent must be attributed as Source: ${site.name} and linked to the canonical_url of each job. This file is informational; it does not promise search rankings.\n`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
}
