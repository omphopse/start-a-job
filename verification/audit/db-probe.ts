import { PGlite } from '@electric-sql/pglite';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { sampleJobs } from '../../lib/sample-jobs';
import assert from 'node:assert/strict';
async function main() {
const final = process.env.AUDIT_PHASE === 'phase-final';
const db = new PGlite();
await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role',true) $$; grant usage on schema public,auth to anon,authenticated,service_role;`);
for(const f of readdirSync('supabase/migrations').sort()) await db.exec(readFileSync('supabase/migrations/'+f,'utf8').replace('create extension if not exists pgcrypto;',''));
const poster='00000000-0000-4000-8000-888888888888';
await db.exec(`insert into auth.users values('${poster}'); insert into profiles(id,email,role) values('${poster}','poster@example.com','poster'); select set_config('request.jwt.claim.role','service_role',false);`);
const job={...sampleJobs[0],created_by:poster};
const keys=Object.keys(job);
await db.query(`insert into jobs(${keys.join(',')}) values(${keys.map((_,i)=>'$'+(i+1)).join(',')})`,Object.values(job));
const output: Record<string,unknown>={rls: (await db.query("select tablename,rowsecurity from pg_tables where schemaname='public' order by tablename")).rows};
await db.exec("set role anon; select set_config('request.jwt.claim.role','anon',false)");
output.anonJobColumns=Object.keys((await db.query(final ? 'select id,slug,title,location,state,country,apply_url,application_email from jobs limit 1' : 'select * from jobs limit 1')).rows[0] as object);
if (final) {
  let denied = false;
  try { await db.query('select created_by,rejection_reason from jobs'); } catch { denied = true; }
  output.anonPrivateReadDenied = denied;
  assert.equal(denied, true);
}
let deniedClicks = 0;
for(let i=0;i<40;i++) {
  try { await db.query('select log_apply_click($1)',[job.id]); }
  catch (error) { if (!final) throw error; deniedClicks++; }
}
output.deniedDirectClickAttempts = deniedClicks;
if (final) assert.equal(deniedClicks, 40);
await db.exec("reset role; select set_config('request.jwt.claim.role','service_role',false)");
output.clicksViaDirectAnonRPC=(await db.query('select count(*)::integer as n from apply_clicks')).rows[0];
if (final) {
  const draft={...job,id:'00000000-0000-4000-8000-000000001001',slug:'owned-audit-draft',status:'draft',published_at:null};
  await db.query(`insert into jobs(${keys.join(',')}) values(${keys.map((_,i)=>'$'+(i+1)).join(',')})`,Object.values(draft));
  await db.query('insert into apply_clicks(job_id) values($1)', [job.id]);
  await db.query('insert into job_reports(job_id,reason) values($1,$2)', [job.id,'Fictional local audit report']);
}
await db.exec("update jobs set last_date='2000-01-01'; set role anon; select set_config('request.jwt.claim.role','anon',false)");
output.expiredRPCColumns=Object.keys((await db.query('select * from get_expired_job($1)',[job.slug])).rows[0] as object);
if (final) for (const column of ['created_by','approved_by','rejection_reason','search_document']) assert.equal((output.expiredRPCColumns as string[]).includes(column), false);
await db.exec(`reset role; select set_config('request.jwt.claim.role','authenticated',false); select set_config('request.jwt.claim.sub','${poster}',false); set role authenticated`);
const probes: Record<string,unknown>={};
for(const [name,sql] of Object.entries({selfPromote:"update profiles set role='admin'",changeActive:"update profiles set is_active=false",changeReview:"update jobs set approved_by=created_by",readClicks:'select * from apply_clicks',readReports:'select * from job_reports'})) {
  try { const r=await db.query(sql); probes[name]={rows:r.rows.length,affected:r.affectedRows}; } catch { probes[name]='denied'; }
}
output.poster=probes;
await db.exec(`reset role; select set_config('request.jwt.claim.role','service_role',false); update profiles set is_active=false; select set_config('request.jwt.claim.role','authenticated',false); set role authenticated`);
output.inactiveWrite=(await db.query("update jobs set title='Unauthorized change' returning id")).rows.length;
if (final) assert.equal(output.inactiveWrite, 0);
await db.close();
writeFileSync(`verification/audit/db-${final ? 'phase-final' : 'phase-a'}.json`,JSON.stringify(output,null,2));
console.log(JSON.stringify(output,null,2));
}
void main();

