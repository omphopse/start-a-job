import {getJob} from '@/lib/data';
import {isCurrent} from '@/lib/jobs';
import {publicJob,publicHeaders} from '@/lib/public-api';
import {site} from '@/lib/config';
import {rateLimit,requestIdentity} from '@/lib/rate-limit';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{file:string}>}){try{if(!await rateLimit('public-api',requestIdentity(request.headers),120,60))return Response.json({error:'Rate limit exceeded'},{status:429,headers:publicHeaders});const {file}=await params;if(!/^[a-z0-9-]+\.json$/.test(file))return Response.json({error:'Not found'},{status:404,headers:publicHeaders});const job=await getJob(file.slice(0,-5));if(!job||!isCurrent(job))return Response.json({error:'Not found'},{status:404,headers:publicHeaders});return Response.json({attribution:`Source: ${site.name}`,job:publicJob(job)},{headers:publicHeaders});}catch{return Response.json({error:'Temporarily unavailable'},{status:503,headers:publicHeaders});}}
export function OPTIONS(){return new Response(null,{status:204,headers:publicHeaders});}
