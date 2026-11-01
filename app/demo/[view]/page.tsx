import { jobDefaultValidDays } from '@/lib/closing-date';
import { CategoryForm } from '@/components/category-form';
import { ReviewQueue } from '@/components/review-queue';
import { UsersPanel } from '@/components/users-panel';
import { notFound } from 'next/navigation';
import { demo } from '@/lib/data';
import { sampleJobs, expiredSample } from '@/lib/sample-jobs';
import { Dashboard } from '@/components/dashboard';
import { JobForm } from '@/components/job-form';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Read-only design preview',
  robots: { index: false, follow: false },
};
export default async function Demo({ params }: { params: Promise<{ view: string }> }) {
  if (!demo()) notFound();
  const { view } = await params;
  if (!['dashboard', 'job-form', 'review', 'users'].includes(view)) notFound();
  return (
    <div className="container section">
      {view === 'review' ? (
        <>
          <h1>Review queue preview</h1>
          <ReviewQueue preview jobs={sampleJobs.slice(0, 1)} />
        </>
      ) : view === 'users' ? (
        <>
          <h1>Publishing team preview</h1>
          <UsersPanel
            preview
            profiles={[
              {
                id: 'demo',
                email: 'poster@example.com',
                full_name: 'Sample poster',
                role: 'poster',
                is_active: true,
              },
            ]}
            counts={{ demo: 3 }}
          />
        </>
      ) : view === 'dashboard' ? (
        <Dashboard
          preview
          profile={{
            id: 'demo',
            email: 'demo@example.com',
            full_name: 'Sample administrator',
            role: 'admin',
            is_active: true,
          }}
          jobs={[...sampleJobs, expiredSample].map((j, i) => ({
            ...j,
            status: i < 3 ? 'pending' : i === 3 ? 'draft' : j.status,
          }))}
        />
      ) : (
        <>
          <h1>Job form preview</h1>
          <p className="demo-notice">Read-only sample. Sign in to create a real submission.</p>
          <CategoryForm preview />
          <JobForm defaultValidDays={jobDefaultValidDays()} job={sampleJobs[0]} preview />
        </>
      )}
    </div>
  );
}
