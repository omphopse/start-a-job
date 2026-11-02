import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { publishingMigration, publishText } from '../../lib/publishing-rules';
import { jobInput } from '../../lib/validation';
import { sampleJobs } from '../../lib/sample-jobs';

test('migration 009 stays synchronized with the shared publishing definition', () => {
  assert.equal(
    readFileSync('supabase/migrations/202611010009_published_required.sql', 'utf8').replaceAll(
      '\r\n',
      '\n',
    ),
    publishingMigration(),
  );
  const names = readdirSync('supabase/migrations')
    .filter((n) => n.endsWith('.sql'))
    .sort();
  assert.deepEqual(
    names.map((n) => n.slice(8, 12)),
    ['0001', '0002', '0001', '0003', '0004', '0005', '0006', '0007', '0008', '0009', '0010'],
  );
});

test('fresh PostgreSQL schema and direct publishing enforce required fields and keep optional text optional', async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role',true) $$; grant usage on schema public,auth to anon,authenticated,service_role;`,
    );
    const files = readdirSync('supabase/migrations')
      .filter((n) => n.endsWith('.sql'))
      .sort();
    for (const file of files.filter((n) => !n.includes('202611010009')))
      await db.exec(
        readFileSync(`supabase/migrations/${file}`, 'utf8').replace(
          'create extension if not exists pgcrypto;',
          '',
        ),
      );
    const owner = '00000000-0000-4000-8000-888888888888';
    await db.exec(
      `insert into auth.users values('${owner}'); insert into profiles(id,email,role) values('${owner}','admin@example.com','admin'); select set_config('request.jwt.claim.role','service_role',false);`,
    );
    const job = {
      ...sampleJobs[0],
      created_by: owner,
      summary: '',
      status: 'published',
      eligibility: '',
      documents_needed: '',
      how_to_apply: '',
    };
    const keys = Object.keys(job);
    await db.query(
      `insert into jobs(${keys.join(',')}) values(${keys.map((_, i) => `$${i + 1}`).join(',')})`,
      Object.values(job),
    );
    await db.exec(publishingMigration());
    assert.equal(
      (await db.query<{ status: string }>('select status from jobs')).rows[0].status,
      'unpublished',
    );
    await db.query('update jobs set summary=$1 where id=$2', [sampleJobs[0].summary, job.id]);
    await db.query("update jobs set status='published' where id=$1", [job.id]);
    for (const [field, [min, max]] of Object.entries(publishText)) {
      for (const value of [...(min ? ['x'.repeat(min - 1)] : []), 'x'.repeat(max + 1)]) {
        const input = { ...sampleJobs[0], official_confirmed: 'on', no_fees: 'on', [field]: value };
        assert.equal(jobInput.safeParse(input).success, false, field);
        await assert.rejects(
          db.query(`update jobs set ${field}=$1 where id=$2`, [value, job.id]),
          /check constraint/,
          field,
        );
      }
    }
    for (const url of [
      'http://company.com/x',
      `https://${('a'.repeat(63) + '.').repeat(4)}com/x`,
      'https://bit.ly/x',
      'https://bit.ly./x',
      'https://%62it.ly/x',
      'https://t.co/x',
      'https://wa.me/123',
      'https://user:pass@company.com/x',
      'https://127.0.0.1/x',
    ])
      await assert.rejects(
        db.query('update jobs set apply_url=$1 where id=$2', [url, job.id]),
        /check constraint/,
        url,
      );
    await db.query(
      "update jobs set apply_url=null, application_email='hr@example.com' where id=$1",
      [job.id],
    );
    await assert.rejects(
      db.query('update jobs set title=$1 where id=$2', ['\t\t\t', job.id]),
      /check constraint/,
    );
    await assert.rejects(
      db.query('update jobs set title=$1 where id=$2', ['😀'.repeat(61), job.id]),
      /check constraint/,
    );
    for (const email of ['a!b@company.com', 'a@x.c', 'a.@company.com']) {
      assert.equal(
        jobInput.safeParse({
          ...sampleJobs[0],
          apply_url: null,
          application_email: email,
          official_confirmed: 'on',
          no_fees: 'on',
        }).success,
        false,
      );
      await assert.rejects(
        db.query('update jobs set application_email=$1 where id=$2', [email, job.id]),
        /check constraint/,
      );
    }
    await db.exec(readFileSync('supabase/rollbacks/202611010009_published_required.sql', 'utf8'));
  } finally {
    await db.close();
  }
});
