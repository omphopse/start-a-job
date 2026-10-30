import {timingSafeEqual} from 'node:crypto';
import {serviceDb} from '@/lib/supabase/server';
import {refreshJobs} from '@/lib/revalidate';
import {notify} from '@/lib/seo/notify';
import {site} from '@/lib/config';
import {today} from '@/lib/jobs';
export async function POST(request:Request){const expected=process.env.CRON_SECRET;const token=request.headers.get('authorization')?.replace(/^Bearer /,'')||'';if(!expected||token.length!==expected.length||!timingSafeEqual(Buffer.from(token),Buffer.from(expected)))return new Response('Unauthorized',{status:401});const yesterday=new Date(new Date(today()).getTime()-86400000).toISOString().slice(0,10);const {data,error}=await serviceDb().from('jobs').select('slug').eq('status','published').eq('last_date',yesterday);if(error)return new Response('Could not check expiry',{status:503});refreshJobs();for(const j of data){refreshJobs(j.slug);await notify(`${site.url}/jobs/${j.slug}`,'URL_DELETED');}return Response.json({expired:data.length});}
