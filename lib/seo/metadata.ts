import type { Metadata } from 'next';
import { site } from '../config';
export function metadata(
  title: string,
  description: string,
  path: string,
  noindex = false,
): Metadata {
  const short = title.slice(0, 59);
  return {
    title: { absolute: short },
    description: description.slice(0, 154),
    alternates: { canonical: `${site.url}${path}` },
    openGraph: {
      title: short,
      description: description.slice(0, 154),
      url: `${site.url}${path}`,
      siteName: site.name,
      type: 'website',
    },
    robots: noindex ? { index: false, follow: true } : { index: true, follow: true },
  };
}
