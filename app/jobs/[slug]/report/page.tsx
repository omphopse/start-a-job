import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getJob} from '@/lib/data';
import {ReportForm} from '@/components/report-form';
export const metadata={title:'Report a job',robots:{index:false,follow:true}};
export default async function Report({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const job=await getJob(slug);if(!job)notFound();return <div className="container section prose"><Link className="text-link" href={`/jobs/${slug}`}>← Back to job</Link><h1 className="report-title">Help keep the next step safe.</h1><p>Report a concern about <strong>{job.title}</strong> at {job.company_name}.</p><ReportForm slug={slug}/></div>}
