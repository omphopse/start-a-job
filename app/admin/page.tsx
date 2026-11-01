import Link from 'next/link';
import { ReviewQueue } from '@/components/review-queue';
import { requireProfile } from '@/lib/auth';
import { serverDb } from '@/lib/supabase/server';
import { Dashboard } from '@/components/dashboard';
import { logout } from './login/actions';
import type { Job } from '@/lib/jobs';
import { site } from '@/lib/config';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Dashboard', robots: { index: false, follow: false } };
export default async function Admin({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  const profile = await requireProfile();
  const db = await serverDb();
  let query = db.from('jobs').select('*').order('updated_at', { ascending: false });
  if (profile.role === 'poster') query = query.eq('created_by', profile.id);
  const { data, error } = await query;
  if (error) throw error;
  return (
    <div className="container section">
      <div className="admin-nav">
        <span>{site.name} workspace</span>
        <form action={logout}>
          <button className="button secondary">Sign out</button>
        </form>
      </div>
      {profile.role === 'admin' && (
        <>
          <div className="admin-links">
            <Link href="/admin/users">Manage posters →</Link>
            <Link href="/admin/reports">Review reports →</Link>
            <Link href="/admin/landing-pages">Edit landing introductions →</Link>
          </div>
          <ReviewQueue jobs={(data as Job[]).filter((j) => j.status === 'pending')} />
        </>
      )}
      {message && (
        <p role="status" className="form-message">
          {(
            {
              saved: 'Job saved.',
              updated: 'Job updated.',
              'reason-required': 'Please give a rejection reason of at least five characters.',
              'confirm-delete': 'Confirm permanent deletion before deleting.',
              forbidden: 'This section is for admins only.',
            } as Record<string, string>
          )[message] || 'That change could not be completed. Check the details and try again.'}
        </p>
      )}
      <Dashboard jobs={data as Job[]} profile={profile} />
    </div>
  );
}
