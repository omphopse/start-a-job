import Link from 'next/link';
import { requireProfile } from '@/lib/auth';
import { serverDb } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Job reports', robots: { index: false, follow: false } };
export default async function Reports() {
  await requireProfile(true);
  const { data, error } = await (
    await serverDb()
  )
    .from('job_reports')
    .select('id,reason,created_at,job_id')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (
    <div className="container section">
      <Link href="/admin">← Dashboard</Link>
      <h1 className="admin-page-title">Community reports</h1>
      {data.length ? (
        data.map((r) => (
          <article className="review-card" key={r.id}>
            <p className="plain-text">{r.reason}</p>
            <p className="updated">Received {r.created_at.slice(0, 10)}</p>
            <Link href={`/admin/jobs/${r.job_id}`} className="button secondary">
              Review job →
            </Link>
          </article>
        ))
      ) : (
        <div className="empty-state">
          <h2>No reports yet.</h2>
          <p>Reports will appear here for review. Unpublish misleading jobs promptly.</p>
        </div>
      )}
    </div>
  );
}
