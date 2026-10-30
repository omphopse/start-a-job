import { LandingPage } from '@/components/landing-page';
import { landingMetadata } from '@/lib/seo/landing-metadata';
import type { Filters } from '@/lib/data';
export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ location: string }>; searchParams: Promise<Filters> };
export async function generateMetadata({ params, searchParams }: Props) {
  return landingMetadata(undefined, (await params).location, await searchParams);
}
export default async function Location({ params, searchParams }: Props) {
  return <LandingPage location={(await params).location} filters={await searchParams} />;
}
