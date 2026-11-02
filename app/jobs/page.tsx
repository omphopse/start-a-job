import { locationFacets } from '@/lib/location-facets';
import { resolveLocationFilters } from '@/lib/location-names';
import { listCategories } from '@/lib/categories';
import { parseFilters } from '@/lib/validation';
import { Fragment } from 'react';
import { AdSlot } from '@/components/ad-slot';
import { metadata } from '@/lib/seo/metadata';
import Link from 'next/link';
import { listJobs, type Filters } from '@/lib/data';
import { JobCard } from '@/components/job-card';
import { FiltersForm } from '@/components/filters';
export const dynamic = 'force-dynamic';
export async function generateMetadata({ searchParams }: { searchParams: Promise<Filters> }) {
  const { rows } = await locationFacets();
  const f = resolveLocationFilters(parseFilters(await searchParams), rows);
  const filters = Object.entries(f).filter(([k, v]) => v && !['page', 'sort'].includes(k));
  const qs = new URLSearchParams(f).toString();
  const noindex = filters.length > 2 || (await listJobs(f)).count === 0;
  return metadata(
    'Fresher and entry-level jobs in India',
    'Browse office and desk jobs by location, category, job type and work mode. Apply on official websites.',
    '/jobs' + (noindex ? '' : qs ? '?' + qs : ''),
    noindex,
  );
}
export default async function Jobs({ searchParams }: { searchParams: Promise<Filters> }) {
  const { rows, remoteCount } = await locationFacets();
  const f = resolveLocationFilters(parseFilters(await searchParams), rows);
  const { jobs, count } = await listJobs(f);
  const categories = await listCategories();
  const page = Math.max(1, Number(f.page) || 1);
  const pageUrl = (n: number) =>
    `/jobs?${new URLSearchParams({ ...f, page: String(n) }).toString()}`;
  return (
    <>
      <section className="listing-head">
        <div className="container">
          <div className="breadcrumb">
            <Link href="/">Home</Link> / Find a job
          </div>
          <p className="eyebrow">A FRESH START, ONE OPPORTUNITY AWAY</p>
          <h1>
            Find your place to <em>begin.</em>
          </h1>
          <p>Real opportunities. Clear details. Your next chapter.</p>
          <form action="/jobs" className="search-box">
            <span aria-hidden="true">⌕</span>
            <label className="sr-only" htmlFor="keyword">
              Search jobs
            </label>
            <input
              id="keyword"
              name="q"
              placeholder="Job title, keyword or company"
              defaultValue={f.q}
            />
            <button className="button">Search jobs →</button>
          </form>
        </div>
      </section>
      <div className="container results-layout">
        <aside className="desktop-filters">
          <FiltersForm
            key={JSON.stringify(f)}
            filters={f}
            categories={categories}
            facets={rows}
            remoteCount={remoteCount}
          />
          <div className="trust-mini">
            <span>♧</span>
            <strong>Your search, made safer.</strong>
            <p>We link to official application pages. You’ll never pay us to apply.</p>
          </div>
        </aside>
        <section className="results">
          <div className="results-toolbar">
            <div>
              <h2>{f.q ? `Results for “${f.q}”` : 'All opportunities'}</h2>
              <p>
                {count} {count === 1 ? 'job' : 'jobs'} to start something good
              </p>
            </div>
            <form>
              <input type="hidden" name="q" value={f.q || ''} />
              {Object.entries(f)
                .filter(([k]) => k !== 'q' && k !== 'sort' && k !== 'page')
                .map(([k, v]) => (
                  <input key={k} type="hidden" name={k} value={v} />
                ))}
              <label className="sort-label">
                Sort by
                <select name="sort" defaultValue={f.sort || 'newest'}>
                  <option value="newest">Newest first</option>
                  <option value="last_date">Closing soon</option>
                </select>
              </label>
              <button className="sort-submit" aria-label="Update sort">
                ↵
              </button>
            </form>
          </div>
          <details className="mobile-filters">
            <summary>☷ Filter opportunities</summary>
            <div className="filter-drawer">
              <FiltersForm
                key={JSON.stringify(f)}
                filters={f}
                categories={categories}
                facets={rows}
                remoteCount={remoteCount}
              />
            </div>
          </details>
          {jobs.length ? (
            jobs.map((j, i) => (
              <Fragment key={j.id}>
                <JobCard job={j} />
                {(i + 1) % 8 === 0 && <AdSlot />}
              </Fragment>
            ))
          ) : (
            <div className="empty-state">
              <h3>No matches just yet.</h3>
              <p>
                Try a broader keyword or clear a filter. A new beginning might be one search away.
              </p>
              <Link href="/jobs" className="button">
                Reset all
              </Link>
            </div>
          )}
          <nav className="pagination" aria-label="Pagination">
            {page > 1 && <Link href={pageUrl(page - 1)}>← Previous</Link>}
            <span>
              Page {page} of {Math.max(1, Math.ceil(count / 20))}
            </span>
            {page * 20 < count && <Link href={pageUrl(page + 1)}>Next →</Link>}
          </nav>
        </section>
      </div>
    </>
  );
}
