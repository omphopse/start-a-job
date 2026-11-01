import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { sampleJobs } from '../../lib/sample-jobs';

test('anonymous table and expired RPC reads cannot select private job metadata', async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role',true) $$; grant usage on schema public,auth to anon,authenticated,service_role;`,
    );
    for (const file of readdirSync('supabase/migrations')
      .filter((name) => name.endsWith('.sql'))
      .sort()) {
      await db.exec(
        readFileSync(`supabase/migrations/${file}`, 'utf8').replace(
          'create extension if not exists pgcrypto;',
          '',
        ),
      );
    }
    const poster = '00000000-0000-4000-8000-888888888888';
    await db.exec(
      `insert into auth.users values('${poster}'); insert into profiles(id,email,role) values('${poster}','poster@example.com','poster'); select set_config('request.jwt.claim.role','service_role',false);`,
    );
    const job = { ...sampleJobs[0], country: 'India', created_by: poster };
    const keys = Object.keys(job);
    await db.query(
      `insert into jobs(${keys.join(',')}) values(${keys.map((_, i) => `$${i + 1}`).join(',')})`,
      Object.values(job),
    );
    await db.exec("set role anon; select set_config('request.jwt.claim.role','anon',false)");
    assert.equal((await db.query('select id,title from jobs')).rows.length, 1);
    for (const column of ['created_by', 'approved_by', 'rejection_reason']) {
      await assert.rejects(db.query(`select ${column} from jobs`), /permission denied/);
    }
    await db.exec(
      "reset role; select set_config('request.jwt.claim.role','service_role',false); update jobs set last_date='2000-01-01'; set role anon; select set_config('request.jwt.claim.role','anon',false)",
    );
    const expired = await db.query<Record<string, unknown>>('select * from get_expired_job($1)', [
      job.slug,
    ]);
    assert.equal(expired.rows.length, 1);
    assert.equal(expired.rows[0].title, job.title);
    for (const column of ['created_by', 'approved_by', 'rejection_reason', 'search_document'])
      assert.equal(column in expired.rows[0], false);
  } finally {
    await db.close();
  }
});
