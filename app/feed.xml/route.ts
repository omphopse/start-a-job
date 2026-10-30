import { listJobs } from '@/lib/data';
import { site } from '@/lib/config';
import { escapeHtml } from '@/lib/seo/schema';
export const dynamic = 'force-dynamic';
export async function GET() {
  const { jobs } = await listJobs({}, 50);
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escapeHtml(site.name)}</title><link>${escapeHtml(site.url)}</link><description>Fresher-friendly desk jobs in India. We link to official sources and never charge fees.</description><language>en-IN</language>${jobs.map((j) => `<item><title>${escapeHtml(j.title + ' — ' + j.company_name)}</title><link>${escapeHtml(site.url + '/jobs/' + j.slug)}</link><guid isPermaLink="true">${escapeHtml(site.url + '/jobs/' + j.slug)}</guid><description>${escapeHtml(j.summary)}</description><pubDate>${new Date(j.published_at || j.created_at).toUTCString()}</pubDate></item>`).join('')}</channel></rss>`,
    {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    },
  );
}
