import { readFileSync, writeFileSync } from 'node:fs';
const env=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1).replace(/^['"]|['"]$/g,'')]}));
const key=env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if(!key||!env.NEXT_PUBLIC_SUPABASE_URL) throw new Error('No public Supabase configuration');
const output=[];
for(const table of ['jobs','profiles','apply_clicks','job_reports','request_limits','categories']) {
  try {const r=await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`,{headers:{apikey:key,Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(15000)});const b=await r.json();output.push({table,status:r.status,rows:Array.isArray(b)?b.length:undefined,columns:Array.isArray(b)&&b[0]?Object.keys(b[0]):[],errorCode:!Array.isArray(b)?b.code:undefined});}
  catch { output.push({table,error:'Network request failed or timed out'}); }
}
for (const status of ['draft','pending','rejected','unpublished']) {
  const r = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/jobs?select=id&status=eq.${status}&limit=1`, { headers: { apikey:key,Authorization:`Bearer ${key}` },signal:AbortSignal.timeout(15000) });
  const b = await r.json();
  output.push({table:'jobs',filter:status,status:r.status,rows:Array.isArray(b)?b.length:undefined});
}
const date = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const expired = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/jobs?select=id&last_date=lt.${date}&limit=1`, { headers: { apikey:key,Authorization:`Bearer ${key}` },signal:AbortSignal.timeout(15000) });
const expiredBody = await expired.json();
output.push({table:'jobs',filter:'expired',status:expired.status,rows:Array.isArray(expiredBody)?expiredBody.length:undefined});
const phase=process.env.AUDIT_PHASE || 'phase-a';
writeFileSync(`verification/audit/live-anon-${phase}.json`,JSON.stringify(output,null,2));console.log(JSON.stringify(output,null,2));
