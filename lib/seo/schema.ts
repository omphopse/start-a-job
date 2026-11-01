import { getApplicationMethod } from '../application-method';
import type { PublicJob } from '../public-job-fields';
import { site } from '../config';
export const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
export function jobSchema(job: PublicJob) {
  const method = getApplicationMethod(job);
  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description:
      `<p>${escapeHtml(job.summary)}</p>` +
      [
        ['Eligibility', job.eligibility],
        ['Documents needed', job.documents_needed],
        ['How to apply', job.how_to_apply],
      ]
        .filter(([, text]) => text?.trim())
        .map(([title, text]) => `<h2>${title}</h2><p>${escapeHtml(text)}</p>`)
        .join(''),
    ...(job.published_at ? { datePosted: job.published_at } : {}),
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
        ...(job.location ? { addressLocality: job.location } : {}),
        ...(job.state ? { addressRegion: job.state } : {}),
        addressCountry: job.country || 'IN',
      },
    },
    ...(job.work_mode === 'remote'
      ? {
          jobLocationType: 'TELECOMMUTE',
          applicantLocationRequirements: { '@type': 'Country', name: job.country || 'India' },
        }
      : {}),
    ...(method?.kind === 'url'
      ? { applicationContact: { '@type': 'ContactPoint', url: method.url } }
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
