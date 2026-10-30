import { parseFilters } from '@/lib/validation';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { landingData } from '@/lib/landing';
import { JobCard } from './job-card';
import { JsonLd } from './json-ld';
import { breadcrumbs } from '@/lib/seo/schema';
import { slugify } from '@/lib/validation';
import type { Filters } from '@/lib/data';
export async function LandingPage({
  category,
  location,
  filters: rawFilters,
}: {
  category?: string;
  location?: string;
  filters: Filters;
}) {
  const filters = parseFilters(rawFilters);
  const data = await landingData(category, location, filters);
  if (!data) notFound();
  const page = Math.max(1, Number(filters.page) || 1);
  const pageUrl = (n: number) =>
    `${data.path}?${new URLSearchParams({ ...filters, page: String(n) })}`;
  return (
    <div className="container section landing-page">
      <div className="breadcrumb">
        <Link href="/">Home</Link> / <Link href="/jobs">Jobs</Link> / {data.title}
      </div>
      <JsonLd
        data={breadcrumbs([
          { name: 'Home', path: '/' },
          { name: 'Jobs', path: '/jobs' },
          { name: data.title, path: data.path },
        ])}
      />
      <p className="eyebrow">YOUR NEXT CHAPTER, A LITTLE CLOSER.</p>
      <h1>{data.title}</h1>
      <p className="lead">{data.intro}</p>
      <p className="landing-count">
        {data.count} current {data.count === 1 ? 'opportunity' : 'opportunities'}
      </p>
      {data.jobs.length ? (
        data.jobs.map((j) => <JobCard key={j.id} job={j} />)
      ) : (
        <div className="empty-state">
          <h2>No current jobs here just yet.</h2>
          <p>Try a nearby city or a related category.</p>
          <Link href={data.parent} className="button">
            Explore more opportunities →
          </Link>
        </div>
      )}
      <nav className="pagination" aria-label="Pagination">
        {page > 1 && <Link href={pageUrl(page - 1)}>← Previous</Link>}
        <span>
          Page {page} of {Math.max(1, Math.ceil(data.count / 20))}
        </span>
        {page * 20 < data.count && <Link href={pageUrl(page + 1)}>Next →</Link>}
      </nav>
      <section className="related-pages">
        <h2>Find your own way forward.</h2>
        <div className="filter-chips">
          {data.categories.map((c) => (
            <Link key={c} href={`/jobs/category/${slugify(c)}`}>
              {c} ↗
            </Link>
          ))}
          {data.locations.slice(0, 8).map((l) => (
            <Link
              key={l}
              href={
                category
                  ? `/jobs/category/${category}/location/${slugify(l)}`
                  : `/jobs/location/${slugify(l)}`
              }
            >
              {l} ↗
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
