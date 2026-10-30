import {LandingPage} from '@/components/landing-page';
import {landingMetadata} from '@/lib/seo/landing-metadata';
import type {Filters} from '@/lib/data';
export const dynamic='force-dynamic';
type Props={params:Promise<{category:string}>;searchParams:Promise<Filters>};
export async function generateMetadata({params,searchParams}:Props){return landingMetadata((await params).category,undefined,await searchParams);}
export default async function Category({params,searchParams}:Props){return <LandingPage category={(await params).category} filters={await searchParams}/>}
