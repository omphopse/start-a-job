import Link from 'next/link';
import {requireProfile,type Profile} from '@/lib/auth';
import {serverDb} from '@/lib/supabase/server';
import {UsersPanel} from '@/components/users-panel';
export const dynamic='force-dynamic';
export const metadata={title:'Publishing team',robots:{index:false,follow:false}};
export default async function Users({searchParams}:{searchParams:Promise<{message?:string}>}){await requireProfile(true);const db=await serverDb();const [profiles,jobs]=await Promise.all([db.from('profiles').select('*').order('full_name'),db.from('jobs').select('created_by')]);if(profiles.error||jobs.error)throw new Error('Could not load team');const counts:Record<string,number>={};jobs.data.forEach(j=>counts[j.created_by]=(counts[j.created_by]||0)+1);const {message}=await searchParams;return <div className="container section"><Link className="text-link" href="/admin">← Dashboard</Link><h1 className="admin-page-title">People who open doors.</h1>{message&&<p role="status" className="form-message">{message==='created'?'Poster account created. Ask them to sign in with their email.':'That change could not be completed. Check the details and try again.'}</p>}<UsersPanel profiles={profiles.data as Profile[]} counts={counts}/></div>}
