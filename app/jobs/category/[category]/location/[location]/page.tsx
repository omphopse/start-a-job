import {LandingPage} from '@/components/landing-page';
import {landingMetadata} from '@/lib/seo/landing-metadata';
import type {Filters} from '@/lib/data';
export const dynamic='force-dynamic';
type Props={params:Promise<{category:string;location:string}>;searchParams:Promise<Filters>};
export async function generateMetadata({params,searchParams}:Props){const p=await params;return landingMetadata(p.category,p.location,await searchParams);}
export default async function Combined({params,searchParams}:Props){const p=await params;return <LandingPage category={p.category} location={p.location} filters={await searchParams}/>}
