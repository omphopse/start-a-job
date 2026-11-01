import { jobDefaultValidDays } from '@/lib/closing-date';
import { AdSlot } from '@/components/ad-slot';
import { metadata } from '@/lib/seo/metadata';
import { JsonLd } from '@/components/json-ld';
import { jobSchema, breadcrumbs } from '@/lib/seo/schema';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getJob, similarJobs } from '@/lib/data';
import { isCurrent, today } from '@/lib/jobs';
import { JobCard, posted } from '@/components/job-card';
import { ApplicationPanel } from '@/components/application-panel';
import { getApplicationMethod } from '@/lib/application-method';
import { after } from 'next/server';
import { requestPerformance } from '@/lib/request-performance';
import { site } from '@/lib/config';
// No request cookies or headers enter this public ISR page.
export const revalidate = 60;
export function generateStaticParams() {
  return [];
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const job = await getJob((await params).slug);
  return job
    ? metadata(
        job.title.slice(0, 30) + ' · ' + job.company_name.slice(0, 15) + ' · ' + job.id.slice(0, 8),
        job.title +
          (job.location || job.state || job.country
            ? ' in ' + [job.location, job.state, job.country].filter(Boolean).join(', ')
            : '') +
          '. ' +
          job.qualification +
          '.' +
          (job.last_date ? ' Apply by ' + job.last_date + '.' : ''),
        '/jobs/' + job.slug,
        !isCurrent(job),
      )
    : {};
}
export default async function JobDetail({ params }: { params: Promise<{ slug: string }> }) {
  const timing = requestPerformance();
  if (process.env.PERF_REQUESTS === '1') after(() => timing.finish());
  const { slug } = await params;
  const job = await getJob(slug);
  if (!job) notFound();
  const current = isCurrent(job);
  const jobs = await similarJobs(job.category);
  // Server-only diagnostic clock does not affect rendered output.
  // eslint-disable-next-line react-hooks/purity
  const transformationStarted = performance.now();
  const days = job.last_date
    ? Math.ceil((new Date(job.last_date).getTime() - new Date(today()).getTime()) / 86400000)
    : null;
  const delay = Math.max(
    0,
    Math.min(60, Number(process.env.NEXT_PUBLIC_APPLY_DELAY_SECONDS) || 10),
  );
  const application = getApplicationMethod(job);
  const host =
    application?.kind === 'url'
      ? new URL(application.url).host
      : application?.kind === 'email'
        ? application.email.split('@')[1]
        : null;
  const sections = [
    ['Eligibility', job.eligibility],
    ['Documents needed', job.documents_needed],
    ['How to apply', job.how_to_apply],
  ].filter(([, text]) => text?.trim());
  timing.record('public.transform', transformationStarted);
  return (
    <div className="container detail-page">
      {current && <JsonLd data={jobSchema(job)} />}
      <JsonLd
        data={breadcrumbs([
          { name: 'Home', path: '/' },
          { name: 'Jobs', path: '/jobs' },
          { name: job.title, path: `/jobs/${job.slug}` },
        ])}
      />
      <div className="breadcrumb">
        <Link href="/">Home</Link> / <Link href="/jobs">Jobs</Link> /{' '}
        <Link href={`/jobs?category=${encodeURIComponent(job.category)}`}>{job.category}</Link> /{' '}
        {job.title}
      </div>
      <div className="detail-header">
        {host && (
          <span className="verified-badge">
            {application?.kind === 'email'
              ? 'Application email'
              : host === 'example.com'
                ? 'Sample source'
                : 'Verified source'}
            : {host}
            {application?.kind === 'url' ? ' ↗' : ''}
          </span>
        )}
        <h1>{job.title}</h1>
        <p className="detail-company">{job.company_name}</p>
        <div className="job-meta">
          <span>
            ⌖{' '}
            {[job.location, job.state, job.country].filter(Boolean).join(', ') ||
              'Location not specified'}
          </span>
          <span>▱ {job.work_mode === 'office' ? 'Work from office' : job.work_mode}</span>
          <span>Posted {posted(job.published_at).toLowerCase()}</span>
        </div>
        {job.last_date && (
          <p className={`last-date ${days !== null && days <= 3 ? 'urgent' : ''}`}>
            Last date: <strong>{job.last_date}</strong>
            {days !== null && days >= 0 && days <= 3 ? ' · Closing soon' : ''}
          </p>
        )}
      </div>
      {!job.last_date && jobDefaultValidDays() === 0 && <p>No closing date has been specified.</p>}
      {!current && (
        <section className="expired-notice">
          <h2>This job has expired</h2>
          <p>The application deadline has passed. Explore similar current opportunities below.</p>
          <Link href="/jobs" className="button">
            Find current jobs →
          </Link>
        </section>
      )}
      <p className="answer-first">
        {job.company_name} is listing a {job.title.toLowerCase()} role
        {[job.location, job.state, job.country].filter(Boolean).length
          ? ` in ${[job.location, job.state, job.country].filter(Boolean).join(', ')}`
          : ''}
        . Candidates with {job.qualification.toLowerCase()} qualifications and{' '}
        {job.experience_level === 'fresher'
          ? 'no prior experience'
          : `${job.experience_level} years of experience`}{' '}
        can apply through the official source.{' '}
        {job.last_date ? `The last date to apply is ${job.last_date}.` : ''}
      </p>
      <dl className="facts-grid">
        {[
          ['Qualification', job.qualification],
          [
            'Experience',
            job.experience_level === 'fresher' ? 'Fresher' : `${job.experience_level} years`,
          ],
          ['Salary', job.salary_text],
          ...(job.vacancies ? [['Vacancies', job.vacancies]] : []),
          ['Job type', job.job_type.replace('-', ' ')],
        ].map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="detail-columns">
        <article className="detail-content">
          {sections.length > 0 && (
            <section className="checklist">
              <p className="eyebrow">A QUICK CHECK BEFORE YOUR NEXT STEP</p>
              <h2>Before you apply</h2>
              <p>
                Check your eligibility, prepare your documents and read the official application
                instructions.
              </p>
              {sections.map(([title, text], i) => (
                <div key={title} className="checklist-item">
                  <span aria-hidden="true">0{i + 1}</span>
                  <div>
                    <h2>{title}</h2>
                    <p>{text}</p>
                  </div>
                </div>
              ))}
            </section>
          )}
          <section className="full-details">
            <h2>About this opportunity</h2>
            <p className="plain-text">{job.summary}</p>
          </section>
          {process.env.NEXT_PUBLIC_ADSENSE_CLIENT && (
            <>
              <AdSlot />
              <section className="ad-buffer">
                <h2>Your application checklist</h2>
                <p>
                  Keep your résumé ready, double-check the deadline and read the official notice
                  before continuing.
                </p>
              </section>
            </>
          )}
          {current && <ApplicationPanel job={job} delay={delay} />}
          <div className="report-link">
            <a href={`/jobs/${job.slug}/report`}>⚑ Report this job</a>
            <p>Something doesn’t look right? Help us keep the community safe.</p>
          </div>
        </article>
        <aside className="detail-aside">
          <div className="trust-mini">
            <span>♧</span>
            <strong>Your first job should be a safe step.</strong>
            <p>
              {site.name} shares opportunities and links you to the source. We are not the employer,
              and we never charge application fees.
            </p>
            <Link href="/disclaimer" className="text-link">
              Read our promise ↗
            </Link>
          </div>
          <Link
            href={`/jobs?category=${encodeURIComponent(job.category)}`}
            className="button secondary"
          >
            More {job.category} jobs →
          </Link>
        </aside>
      </div>
      <section className="similar-jobs">
        <h2>A few more possibilities</h2>
        <div className="home-job-list">
          {jobs
            .filter((j) => j.id !== job.id)
            .slice(0, 3)
            .map((j) => (
              <JobCard key={j.id} job={j} />
            ))}
        </div>
        <Link href="/jobs" className="text-link">
          Browse all current jobs →
        </Link>
      </section>
    </div>
  );
}
