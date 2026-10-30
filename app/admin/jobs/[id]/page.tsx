import Link from 'next/link';
import {notFound} from 'next/navigation';
import {z} from 'zod';
import {requireProfile} from '@/lib/auth';
import {serverDb} from '@/lib/supabase/server';
import {JobForm} from '@/components/job-form';
import type {Job} from '@/lib/jobs';
export const dynamic='force-dynamic';
export default async function Edit({params}:{params:Promise<{id:string}>}){const profile=await requireProfile();const {id}=await params;let job:Job|undefined;if(id!=='new'){if(!z.uuid().safeParse(id).success)notFound();const {data,error}=await (await serverDb()).from('jobs').select('*').eq('id',id).single();if(error||!data)notFound();job=data as Job;if(profile.role==='poster'&&(job.created_by!==profile.id||!['draft','pending','rejected'].includes(job.status)))notFound();}return <div className="container section admin-form-page"><Link className="text-link" href="/admin">← Back to dashboard</Link><h1>{job?'Edit opportunity':'Open a new door.'}</h1><p>Use clear, original summaries and link only to official application sources.</p>{job?.rejection_reason&&<p className="form-message">Review feedback: {job.rejection_reason}</p>}<JobForm job={job} admin={profile.role==='admin'}/></div>}
