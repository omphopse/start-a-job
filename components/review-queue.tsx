import Link from 'next/link';
import type { Job } from '@/lib/jobs';
import { reviewJob } from '@/app/admin/review/actions';
import { applicationMailto, getApplicationMethod } from '@/lib/application-method';
function ReviewApplication({ job }: { job: Job }) {
  const method = getApplicationMethod(job);
  if (method?.kind === 'url')
    return (
      <p>
        <a className="text-link" href={method.url} target="_blank" rel="noopener noreferrer">
          Review official source: {new URL(method.url).host} ↗
        </a>
      </p>
    );
  if (method?.kind === 'email')
    return (
      <p>
        <a className="text-link" href={applicationMailto(method.email)}>
          Review application email: {method.email}
        </a>
      </p>
    );
  return <p>Application destination unavailable. Edit the job before approval.</p>;
}
export function ReviewQueue({ jobs, preview = false }: { jobs: Job[]; preview?: boolean }) {
  return (
    <section className="review-queue">
      <div className="dashboard-section-heading">
        <h2>Pending approval</h2>
        <span>{jobs.length} awaiting a careful review</span>
      </div>
      {jobs.length ? (
        jobs.map((j) => (
          <article key={j.id} className="review-card">
            <h3>{j.title}</h3>
            <p>
              {j.company_name} · {j.location}
            </p>
            <p className="plain-text">{j.summary}</p>
            <ReviewApplication job={j} />
            <form action={reviewJob}>
              <fieldset disabled={preview}>
                <input type="hidden" name="id" value={j.id} />
                <label className="checkbox-label">
                  <input type="checkbox" name="official_confirmed" />I verified the official source
                  and listing details.
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" name="no_fees" />I verified that this opportunity does not
                  request fees.
                </label>
                <label>
                  Rejection reason (required when rejecting)
                  <textarea name="reason" rows={2} maxLength={1000} />
                </label>
                <div className="form-actions">
                  <button className="button" name="intent" value="approve">
                    Approve & publish
                  </button>
                  <button className="button secondary" name="intent" value="reject">
                    Reject with reason
                  </button>
                  {!preview && (
                    <Link className="button secondary" href={`/admin/jobs/${j.id}`}>
                      Edit details
                    </Link>
                  )}
                </div>
              </fieldset>
            </form>
          </article>
        ))
      ) : (
        <div className="empty-state">
          <h3>You’re all caught up.</h3>
          <p>New poster submissions will appear here for review.</p>
        </div>
      )}
    </section>
  );
}
