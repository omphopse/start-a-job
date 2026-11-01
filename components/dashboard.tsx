'use client';
import { useState } from 'react';
import { isExpired } from '@/lib/jobs';
import Link from 'next/link';
import type { Job } from '@/lib/jobs';
import type { Profile } from '@/lib/auth';
export function Dashboard({
  jobs,
  profile,
  preview = false,
}: {
  jobs: Job[];
  profile: Profile;
  preview?: boolean;
}) {
  const [filter, setFilter] = useState('all');
  const visible = jobs.filter(
    (job) => filter === 'all' || (filter === 'expired' ? isExpired(job) : job.status === filter),
  );
  return (
    <>
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">{profile.role === 'admin' ? 'ADMIN' : 'POSTER'} WORKSPACE</p>
          <h1>Good opportunities start here.</h1>
          <p>Welcome back, {profile.full_name || 'there'}. Let’s open a few doors.</p>
        </div>
        {!preview && (
          <Link className="button" href="/admin/jobs/new">
            + Post a job
          </Link>
        )}
      </div>
      {preview && (
        <p className="demo-notice">
          Read-only sample dashboard. No authenticated account or live data is shown.
        </p>
      )}
      <div className="dashboard-stats">
        {[
          ['Total jobs', jobs.length],
          ['Pending review', jobs.filter((j) => j.status === 'pending').length],
          ['Published', jobs.filter((j) => j.status === 'published').length],
          ['Drafts', jobs.filter((j) => j.status === 'draft').length],
        ].map(([label, n]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{n}</strong>
          </div>
        ))}
      </div>
      <div className="dashboard-section-heading">
        <h2>{profile.role === 'admin' ? 'Job overview' : 'Your jobs'}</h2>
        <span>{jobs.length} opportunities</span>
      </div>
      <label>
        Filter jobs by status
        <select value={filter} onChange={(event) => setFilter(event.target.value)}>
          {['all', 'draft', 'pending', 'published', 'rejected', 'unpublished', 'expired'].map(
            (value) => (
              <option key={value} value={value}>
                {value === 'expired' ? 'Expired' : value}
              </option>
            ),
          )}
        </select>
      </label>
      <div className="dashboard-jobs">
        {visible.length ? (
          visible.map((j) => (
            <article key={j.id} className="dashboard-job">
              <div>
                <span className={`tag status-${j.status}`}>{j.status}</span>
                {isExpired(j) && <span className="tag expired-badge">Expired</span>}
                <h3>{j.title}</h3>
                <p>
                  {j.company_name} · {j.location}
                </p>
                {j.rejection_reason && (
                  <p className="rejection">Review feedback: {j.rejection_reason}</p>
                )}
              </div>
              <div>
                <span className="updated">Updated {j.updated_at.slice(0, 10)}</span>
                {!preview &&
                  (profile.role === 'admin' ||
                    ['draft', 'pending', 'rejected'].includes(j.status)) && (
                    <Link className="button secondary" href={`/admin/jobs/${j.id}`}>
                      Edit job →
                    </Link>
                  )}
              </div>
            </article>
          ))
        ) : (
          <div className="empty-state">
            <h3>
              {filter === 'all'
                ? 'Your first opportunity starts here.'
                : 'No jobs match this filter.'}
            </h3>
            <p>Create a draft, check the official source and submit it for review.</p>
            <Link className="button" href="/admin/jobs/new">
              Create a job →
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
