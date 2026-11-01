import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { PUBLIC_JOB_COLUMN_NAMES, PUBLIC_JOB_COLUMNS } from '../../lib/public-job-fields';
import { sampleJobs } from '../../lib/sample-jobs';

test('click logging can only be executed by the rate-limited server role', async () => {
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
    for (const role of ['anon', 'authenticated']) {
      const result = await db.query<{ allowed: boolean }>(
        "select has_function_privilege($1,'public.log_apply_click(uuid)','execute') as allowed",
        [role],
      );
      assert.equal(result.rows[0].allowed, false, `${role} must not bypass the server limiter`);
      await db.exec(`set role ${role}`);
      await assert.rejects(
        db.query('select log_apply_click($1)', [sampleJobs[0].id]),
        /permission denied/,
      );
      await db.exec('reset role');
    }
    const server = await db.query<{ allowed: boolean }>(
      "select has_function_privilege('service_role','public.log_apply_click(uuid)','execute') as allowed",
    );
    assert.equal(server.rows[0].allowed, true);
  } finally {
    await db.close();
  }
});

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
    const allColumns = await db.query<{ column_name: string }>(
      `select column_name from information_schema.columns where table_schema='public' and table_name='jobs'`,
    );
    await db.exec("set role anon; select set_config('request.jwt.claim.role','anon',false)");
    assert.equal((await db.query('select id,title from jobs')).rows.length, 1);
    for (const { column_name: column } of allColumns.rows.filter(
      ({ column_name }) => !PUBLIC_JOB_COLUMN_NAMES.some((allowed) => allowed === column_name),
    )) {
      await assert.rejects(db.query(`select ${column} from jobs`), /permission denied/);
    }
    await assert.rejects(db.query('select * from jobs'), /permission denied/);
    assert.equal((await db.query(`select ${PUBLIC_JOB_COLUMNS} from jobs`)).rows.length, 1);
    const searched = await db.query<Record<string, unknown>>(
      'select * from search_public_jobs($1)',
      [job.title],
    );
    assert.equal(searched.rows.length, 1);
    const detail = await db.query<Record<string, unknown>>('select * from get_public_job($1)', [
      job.slug,
    ]);
    assert.deepEqual(Object.keys(detail.rows[0]).sort(), [...PUBLIC_JOB_COLUMN_NAMES].sort());
    assert.deepEqual(Object.keys(searched.rows[0]).sort(), [...PUBLIC_JOB_COLUMN_NAMES].sort());
    await db.exec('reset role');
    await db.exec(
      "select set_config('request.jwt.claim.role','service_role',false); update jobs set status='draft'",
    );
    await db.exec('set role anon');
    assert.equal(
      (await db.query('select * from search_public_jobs($1)', [job.title])).rows.length,
      0,
    );
    await db.exec("reset role; update jobs set status='published'; set role anon");
    const otherPoster = '00000000-0000-4000-8000-777777777777';
    await db.exec(
      `reset role; insert into auth.users values('${otherPoster}'); insert into profiles(id,email,role) values('${otherPoster}','other@example.com','poster'); select set_config('request.jwt.claim.role','authenticated',false); select set_config('request.jwt.claim.sub','${otherPoster}',false); set role authenticated`,
    );
    assert.equal(
      (await db.query('select created_by,rejection_reason from jobs where id=$1', [job.id])).rows
        .length,
      0,
      'a different poster cannot read internal metadata even on a published row',
    );
    await db.exec(
      `reset role; select set_config('request.jwt.claim.sub','${poster}',false); set role authenticated`,
    );
    assert.equal(
      (await db.query('select created_by from jobs where id=$1', [job.id])).rows.length,
      1,
      'the owning poster retains access to their own job',
    );
    await db.exec(
      "reset role; select set_config('request.jwt.claim.role','service_role',false); update jobs set last_date='2000-01-01'; set role anon; select set_config('request.jwt.claim.role','anon',false)",
    );
    assert.equal(
      (await db.query('select * from search_public_jobs($1)', [job.title])).rows.length,
      0,
      'the definer search function must exclude expired jobs even though it bypasses RLS',
    );
    assert.equal((await db.query('select * from get_public_job($1)', [job.slug])).rows.length, 0);
    const expired = await db.query<Record<string, unknown>>('select * from get_expired_job($1)', [
      job.slug,
    ]);
    assert.equal(expired.rows.length, 1);
    assert.equal(expired.rows[0].title, job.title);
    for (const column of [
      'created_by',
      'approved_by',
      'rejection_reason',
      'search_document',
      'created_at',
      'updated_at',
      'status',
    ])
      assert.equal(column in expired.rows[0], false);
    await db.exec('reset role');
    await db.exec(
      readFileSync('supabase/rollbacks/202611010008_public_search_boundary.sql', 'utf8'),
    );
    await db.exec('set role anon');
    await db.query('select search_document from jobs');
    await assert.rejects(db.query('select created_by from jobs'), /permission denied/);
    await db.exec('reset role');
    await db.exec(
      readFileSync('supabase/migrations/202611010008_public_search_boundary.sql', 'utf8'),
    );
    await db.exec(
      readFileSync('supabase/migrations/202611010008_public_search_boundary.sql', 'utf8'),
    );
    await db.exec('set role anon');
    for (const field of ['search_document', 'created_at', 'updated_at', 'status'])
      await assert.rejects(db.query(`select ${field} from jobs`), /permission denied/);
  } finally {
    await db.close();
  }
});
