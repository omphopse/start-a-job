import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { sampleJobs } from '../../lib/sample-jobs';
test('PostgreSQL RLS: anonymous cannot read drafts; poster cannot publish', async () => {
  const db = new PGlite();
  await db.exec(
    `create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role',true) $$; grant usage on schema public,auth to anon,authenticated,service_role; grant execute on all functions in schema auth to anon,authenticated,service_role;`,
  );
  await db.exec(
    readFileSync('supabase/migrations/202610300001_initial.sql', 'utf8').replace(
      'create extension if not exists pgcrypto;',
      '',
    ),
  );
  const admin = '00000000-0000-4000-8000-999999999999',
    poster = '00000000-0000-4000-8000-888888888888';
  await db.exec(
    `insert into auth.users values('${admin}'),('${poster}'); insert into profiles(id,email,role) values('${admin}','admin@example.com','admin'),('${poster}','poster@example.com','poster'); select set_config('request.jwt.claim.role','service_role',false);`,
  );
  for (const [i, status] of ['published', 'draft', 'pending', 'rejected'].entries()) {
    const job = { ...sampleJobs[i], status, created_by: poster };
    const keys = Object.keys(job);
    await db.query(
      `insert into jobs(${keys.join(',')}) values(${keys.map((_, n) => `$${n + 1}`).join(',')})`,
      Object.values(job),
    );
  }
  await db.exec(`set role anon; select set_config('request.jwt.claim.role','anon',false);`);
  const publicRows = await db.query<{ status: string }>('select status from jobs');
  assert.deepEqual(
    publicRows.rows.map((j) => j.status),
    ['published'],
  );
  await db.exec(
    `reset role; set role authenticated; select set_config('request.jwt.claim.role','authenticated',false); select set_config('request.jwt.claim.sub','${poster}',false);`,
  );
  assert.equal((await db.query('select * from jobs')).rows.length, 4);
  await assert.rejects(
    db.exec("update jobs set status='published' where status='draft'"),
    /publish/,
  );
  await db.exec("update jobs set status='pending' where status='draft'");
  await assert.rejects(
    db.exec("update jobs set approved_by=created_by where status='pending'"),
    /Protected/,
  );
  await db.exec(
    `reset role; select set_config('request.jwt.claim.sub','${admin}',false); set role authenticated; update profiles set is_active=false where id='${poster}'; reset role; select set_config('request.jwt.claim.sub','${poster}',false); set role authenticated;`,
  );
  assert.equal((await db.query("select * from jobs where status<>'published'")).rows.length, 0);
  await db.close();
});
