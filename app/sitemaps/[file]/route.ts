import { normalizeLocationName } from '@/lib/location-names';
import { slugify } from '@/lib/validation';
import { site } from '@/lib/config';
import { allCurrentJobs } from '@/lib/seo/sitemap';
import { escapeHtml } from '@/lib/seo/schema';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  let urls: { path: string; updated?: string }[] = [];
  if (file === 'static.xml')
    urls = ['', '/jobs', '/about', '/contact', '/privacy-policy', '/disclaimer'].map((path) => ({
      path,
    }));
  else if (file === 'jobs.xml')
    urls = (await allCurrentJobs()).map((j) => ({
      path: `/jobs/${j.slug}`,
      updated: j.published_at || undefined,
    }));
  else if (file === 'categories.xml') {
    const paths = new Map<string, string>();
    for (const j of await allCurrentJobs())
      for (const path of [
        `/jobs/category/${slugify(j.category)}`,
        `/jobs/location/${slugify(normalizeLocationName(j.location))}`,
        `/jobs/location/${slugify(normalizeLocationName(j.state))}`,
        `/jobs/category/${slugify(j.category)}/location/${slugify(normalizeLocationName(j.location))}`,
      ])
        if (
          !path.endsWith('/location/') &&
          j.published_at &&
          (!paths.has(path) || paths.get(path)! < j.published_at)
        )
          paths.set(path, j.published_at);
    urls = [...paths].map(([path, updated]) => ({ path, updated }));
  } else return new Response('Not found', { status: 404 });
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${escapeHtml(site.url + u.path)}</loc>${u.updated ? `<lastmod>${u.updated}</lastmod>` : ''}</url>`).join('')}</urlset>`,
    { headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'no-store' } },
  );
}
