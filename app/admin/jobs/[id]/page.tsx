import { listCategories } from '@/lib/categories';
import { CategoryForm } from '@/components/category-form';
import { AdminJobControls } from '@/components/admin-job-controls';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { requireProfile } from '@/lib/auth';
import { serverDb } from '@/lib/supabase/server';
import { JobForm } from '@/components/job-form';
import type { Job } from '@/lib/jobs';
import { after } from 'next/server';
import { requestPerformance } from '@/lib/request-performance';
export const dynamic = 'force-dynamic';
export default async function Edit({ params }: { params: Promise<{ id: string }> }) {
  const timing = requestPerformance();
  if (process.env.PERF_REQUESTS === '1') after(() => timing.finish());
  // Server-only diagnostic clock; it never affects rendered output.
  // eslint-disable-next-line react-hooks/purity
  const started = performance.now();
  const { id } = await params;
  if (id !== 'new' && !z.uuid().safeParse(id).success) notFound();
  const [profile, categories, result] = await timing.measure('page.data', () =>
    Promise.all([
      requireProfile(),
      timing.measure('categories.read', () => listCategories()),
      id === 'new'
        ? Promise.resolve(null)
        : timing.measure('query.editJob', async () =>
            (await serverDb()).from('jobs').select('*').eq('id', id).single(),
          ),
    ]),
  );
  // eslint-disable-next-line react-hooks/purity
  const logicStarted = performance.now();
  let job: Job | undefined;
  if (result) {
    const { data, error } = result;
    if (error || !data) notFound();
    job = data as Job;
    if (
      profile.role === 'poster' &&
      (job.created_by !== profile.id || !['draft', 'pending', 'rejected'].includes(job.status))
    )
      notFound();
  }
  timing.record('page.authorization', logicStarted);
  timing.record('page.component', started);
  return (
    <div className="container section admin-form-page">
      <Link className="text-link" href="/admin">
        ← Back to dashboard
      </Link>
      <h1>{job ? 'Edit opportunity' : 'Open a new door.'}</h1>
      <p>Use clear, original summaries and link only to official application sources.</p>
      {job?.rejection_reason && (
        <p className="form-message">Review feedback: {job.rejection_reason}</p>
      )}
      {profile.role === 'admin' && job && <AdminJobControls id={job.id} />}
      {profile.role === 'admin' && <CategoryForm />}
      <JobForm job={job} admin={profile.role === 'admin'} categories={categories} />
    </div>
  );
}
