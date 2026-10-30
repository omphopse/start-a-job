import { apiQuery, publicJob, publicHeaders } from '@/lib/public-api';
import { listJobs } from '@/lib/data';
import { site } from '@/lib/config';
import { rateLimit, requestIdentity } from '@/lib/rate-limit';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    if (!(await rateLimit('public-api', requestIdentity(request.headers), 120, 60)))
      return Response.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { ...publicHeaders, 'Retry-After': '60' } },
      );
    const parsed = apiQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success)
      return Response.json(
        {
          error: 'Invalid query parameters',
          details: parsed.error.issues.map((i) => i.path.join('.')),
        },
        { status: 400, headers: publicHeaders },
      );
    const { page, limit, ...filters } = parsed.data;
    const { jobs, count } = await listJobs({ ...filters, page: String(page) }, limit);
    return Response.json(
      { attribution: `Source: ${site.name}`, page, limit, total: count, jobs: jobs.map(publicJob) },
      { headers: publicHeaders },
    );
  } catch {
    return Response.json(
      { error: 'Jobs are temporarily unavailable' },
      { status: 503, headers: publicHeaders },
    );
  }
}
export function OPTIONS() {
  return new Response(null, { status: 204, headers: publicHeaders });
}
