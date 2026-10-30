import type { Job } from '../jobs';
import { site } from '../config';
export const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
export function jobSchema(job: Job) {
  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: `<p>${escapeHtml(job.summary)}</p><h2>Eligibility</h2><p>${escapeHtml(job.eligibility)}</p><h2>Documents needed</h2><p>${escapeHtml(job.documents_needed)}</p><h2>How to apply</h2><p>${escapeHtml(job.how_to_apply)}</p>`,
    datePosted: job.published_at || job.created_at,
    ...(job.last_date ? { validThrough: `${job.last_date}T23:59:59+05:30` } : {}),
    employmentType: (
      {
        'full-time': 'FULL_TIME',
        'part-time': 'PART_TIME',
        internship: 'INTERN',
        contract: 'CONTRACTOR',
      } as const
    )[job.job_type],
    hiringOrganization: { '@type': 'Organization', name: job.company_name },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: job.location,
        addressRegion: job.state,
        addressCountry: 'IN',
      },
    },
    ...(job.work_mode === 'remote'
      ? {
          jobLocationType: 'TELECOMMUTE',
          applicantLocationRequirements: { '@type': 'Country', name: 'India' },
        }
      : {}),
    directApply: false,
    url: `${site.url}/jobs/${job.slug}`,
    identifier: { '@type': 'PropertyValue', name: site.name, value: job.id },
  };
}
export function breadcrumbs(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((i, n) => ({
      '@type': 'ListItem',
      position: n + 1,
      name: i.name,
      item: `${site.url}${i.path}`,
    })),
  };
}
export function homeSchema() {
  return [
    { '@context': 'https://schema.org', '@type': 'Organization', name: site.name, url: site.url },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: site.name,
      url: site.url,
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${site.url}/jobs?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
  ];
}
