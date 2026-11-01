import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { sampleJobs } from '../../lib/sample-jobs';

test('deletion tombstones expose only jobs known to have been public, never drafts or unclassified history', async () => {
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
      if (file === '202610300001_initial.sql')
        await db.exec("insert into deleted_jobs(slug) values('unclassified-legacy-record')");
    }
    const poster = '00000000-0000-4000-8000-888888888888';
    await db.exec(
      `insert into auth.users values('${poster}'); insert into profiles(id,email,role) values('${poster}','poster@example.com','poster'); select set_config('request.jwt.claim.role','service_role',false);`,
    );
    for (const [index, status] of ['published', 'draft'].entries()) {
      const job = {
        ...sampleJobs[index],
        created_by: poster,
        status,
        published_at: status === 'published' ? sampleJobs[index].published_at : null,
      };
      const keys = Object.keys(job);
      await db.query(
        `insert into jobs(${keys.join(',')}) values(${keys.map((_, i) => `$${i + 1}`).join(',')})`,
        Object.values(job),
      );
      await db.query('delete from jobs where id=$1', [job.id]);
    }
    await db.exec("set role anon; select set_config('request.jwt.claim.role','anon',false)");
    const publicRows = await db.query<{ slug: string }>(
      'select slug from deleted_jobs order by slug',
    );
    assert.deepEqual(
      publicRows.rows.map((row) => row.slug),
      [sampleJobs[0].slug],
    );
    await db.exec('reset role');
    assert.equal(
      (await db.query('select slug from deleted_jobs where slug=$1', [sampleJobs[1].slug])).rows
        .length,
      0,
    );
    assert.equal(
      (await db.query("select slug from deleted_jobs where slug='unclassified-legacy-record'")).rows
        .length,
      1,
      'legacy records are retained for owner review rather than deleted',
    );
  } finally {
    await db.close();
  }
});
