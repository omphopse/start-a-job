import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { createPerformanceTrace } from './lib/performance';
import { isDeletedJob } from './lib/deleted-job-cache';
export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/jobs/')) {
    const timing = createPerformanceTrace('public-proxy');
    const removed = await timing.measure('public.tombstone.read', () =>
      isDeletedJob(request.nextUrl.pathname.split('/')[2]),
    );
    timing.finish();
    if (removed)
      return new NextResponse(
        '<!doctype html><html lang="en"><title>Job removed</title><body><h1>This job has been removed</h1><p>This listing is permanently unavailable.</p><a href="/jobs">Browse current jobs</a></body></html>',
        {
          status: 410,
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex' },
        },
      );
    return NextResponse.next();
  }
  if (request.nextUrl.pathname === '/admin/login') return NextResponse.next();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    return NextResponse.redirect(new URL('/admin/login?message=setup', request.url));
  let response = NextResponse.next({ request });
  const timing = createPerformanceTrace('admin-proxy');
  const db = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: { fetch: timing.fetch },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (values) => {
          values.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          values.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              httpOnly: true,
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
            }),
          );
        },
      },
    },
  );
  // Refresh expired cookies here, but leave identity verification and active-role
  // checks to requireProfile in every protected page and Server Action. A session
  // read is only an optimistic redirect check, never an authorization decision.
  const {
    data: { session },
  } = await timing.measure('auth.refreshSession', () => db.auth.getSession());
  timing.finish();
  if (!session) return NextResponse.redirect(new URL('/admin/login', request.url));
  return response;
}
export const config = { matcher: ['/admin/:path*', '/jobs/:slug'] };
