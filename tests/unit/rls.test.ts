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
  await db.exec(readFileSync('supabase/migrations/202610300002_categories_experience.sql', 'utf8'));
  const admin = '00000000-0000-4000-8000-999999999999',
    poster = '00000000-0000-4000-8000-888888888888';
  await db.exec(
    `insert into auth.users values('${admin}'),('${poster}'); insert into profiles(id,email,role) values('${admin}','admin@example.com','admin'),('${poster}','poster@example.com','poster'); select set_config('request.jwt.claim.role','service_role',false);`,
  );
  for (const [i, status] of ['published', 'draft', 'pending', 'rejected'].entries()) {
    const legacy = Object.fromEntries(
      Object.entries(sampleJobs[i]).filter(([key]) => key !== 'application_email'),
    );
    const job = { ...legacy, status, created_by: poster };
    const keys = Object.keys(job);
    await db.query(
      `insert into jobs(${keys.join(',')}) values(${keys.map((_, n) => `$${n + 1}`).join(',')})`,
      Object.values(job),
    );
  }
  const oldUrls = (await db.query('select id,apply_url from jobs order by id')).rows;
  await db.exec(readFileSync('supabase/migrations/202611010001_application_email.sql', 'utf8'));
  await db.exec(readFileSync('supabase/migrations/202611010003_job_country.sql', 'utf8'));
  assert.equal(
    (await db.query<{ country: string }>('select country from jobs limit 1')).rows[0].country,
    'India',
  );
  await db.query(
    "update jobs set location = '', state = '', country = 'Canada' where status = 'draft'",
  );
  assert.deepEqual(
    (await db.query('select id,apply_url from jobs order by id')).rows,
    oldUrls,
    'the migration preserves legacy rows and application URLs',
  );
  assert.equal(
    (await db.query('select * from jobs where application_email is null')).rows.length,
    4,
  );
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
  // An authenticated edit read must not expose another poster's draft, even
  // when started concurrently with the page's active-profile check.
  const otherPoster = '00000000-0000-4000-8000-777777777777';
  await db.exec(`reset role; insert into auth.users values('${otherPoster}');
    insert into profiles(id,email,role) values('${otherPoster}','other@example.com','poster');
    select set_config('request.jwt.claim.role','service_role',false);`);
  const otherJob = {
    ...sampleJobs[0],
    id: '00000000-0000-4000-8000-666666666666',
    slug: 'other-private-draft',
    status: 'draft',
    created_by: otherPoster,
  };
  const otherKeys = Object.keys(otherJob);
  await db.query(
    `insert into jobs(${otherKeys.join(',')}) values(${otherKeys.map((_, n) => `$${n + 1}`).join(',')})`,
    Object.values(otherJob),
  );
  await db.exec("select set_config('request.jwt.claim.role','anon',false); set role anon");
  assert.equal((await db.query('select * from jobs where id=$1', [otherJob.id])).rows.length, 0);
  assert.equal(
    (await db.query('select * from get_expired_job($1)', [otherJob.slug])).rows.length,
    0,
    'the expired-public-job RPC must not expose drafts',
  );
  await db.exec(
    "reset role; select set_config('request.jwt.claim.role','authenticated',false); set role authenticated",
  );
  assert.equal((await db.query('select * from jobs where id=$1', [otherJob.id])).rows.length, 0);
  await db.exec(
    `reset role; select set_config('request.jwt.claim.sub','${admin}',false); set role authenticated;`,
  );
  assert.equal((await db.query('select * from jobs where id=$1', [otherJob.id])).rows.length, 1);
  await db.exec(
    `reset role; select set_config('request.jwt.claim.sub','${poster}',false); set role authenticated;`,
  );
  await assert.rejects(
    db.exec("update jobs set status='published' where status='draft'"),
    /publish/,
  );
  await assert.rejects(
    db.exec("insert into categories(name) values('Poster invented category')"),
    /row-level security/,
  );
  await assert.rejects(
    db.exec("update jobs set category='Unknown category' where status='draft'"),
    /foreign key/,
  );
  await db.exec(
    "update jobs set experience_level='6-9', eligibility='', documents_needed='', how_to_apply='', vacancies=null, last_date=null where status='draft'",
  );
  await db.exec("update jobs set status='pending' where status='draft'");
  await assert.rejects(
    db.exec("update jobs set approved_by=created_by where status='pending'"),
    /Protected/,
  );
  const editableId = sampleJobs[2].id;
  await db.query('update jobs set apply_url=null,application_email=$1 where id=$2', [
    'Recruitment+jobs@company.com',
    editableId,
  ]);
  assert.deepEqual(
    (await db.query('select apply_url,application_email from jobs where id=$1', [editableId])).rows,
    [{ apply_url: null, application_email: 'Recruitment+jobs@company.com' }],
  );
  await assert.rejects(
    db.query('update jobs set apply_url=$1 where id=$2', ['https://company.com/jobs', editableId]),
    /jobs_one_application_method_check/,
  );
  await assert.rejects(
    db.query('update jobs set application_email=null where id=$1', [editableId]),
    /jobs_one_application_method_check/,
  );
  await assert.rejects(
    db.query('update jobs set application_email=$1 where id=$2', ['bad-email', editableId]),
    /jobs_application_email_check/,
  );
  await db.query('update jobs set apply_url=$1,application_email=null where id=$2', [
    'https://company.com/jobs',
    editableId,
  ]);
  assert.deepEqual(
    (await db.query('select apply_url,application_email from jobs where id=$1', [editableId])).rows,
    [{ apply_url: 'https://company.com/jobs', application_email: null }],
  );
  const emailJob = {
    ...sampleJobs[4],
    status: 'draft',
    created_by: poster,
    apply_url: null,
    application_email: 'jobs@company.com',
    published_at: null,
  };
  const emailKeys = Object.keys(emailJob);
  await db.query(
    `insert into jobs(${emailKeys.join(',')}) values(${emailKeys.map((_, n) => `$${n + 1}`).join(',')})`,
    Object.values(emailJob),
  );
  await db.exec(
    "reset role; select set_config('request.jwt.claim.sub','',false); select set_config('request.jwt.claim.role','anon',false); set role anon",
  );
  assert.equal(
    (await db.query('select * from jobs where id=$1', [emailJob.id])).rows.length,
    0,
    'an anonymous reader cannot see the application email of a draft',
  );
  await db.exec(
    `reset role; select set_config('request.jwt.claim.sub','${poster}',false); select set_config('request.jwt.claim.role','authenticated',false); set role authenticated`,
  );
  await db.exec(
    `reset role; select set_config('request.jwt.claim.sub','${admin}',false); set role authenticated; update profiles set is_active=false where id='${poster}'; reset role; select set_config('request.jwt.claim.sub','${poster}',false); set role authenticated;`,
  );
  assert.equal((await db.query("select * from jobs where status<>'published'")).rows.length, 0);
  await db.exec(
    `reset role; select set_config('request.jwt.claim.sub','${admin}',false); set role authenticated; insert into categories(name) values('Quantum Computing');`,
  );
  assert.equal(
    (await db.query("select name from categories where name='Quantum Computing'")).rows.length,
    1,
  );
  await db.query("update jobs set status='published' where id=$1", [emailJob.id]);
  await db.exec(
    "reset role; select set_config('request.jwt.claim.sub','',false); set role anon; select set_config('request.jwt.claim.role','anon',false)",
  );
  assert.deepEqual(
    (await db.query('select apply_url,application_email from jobs where id=$1', [emailJob.id]))
      .rows,
    [{ apply_url: null, application_email: 'jobs@company.com' }],
  );
  await db.exec(
    `reset role; select set_config('request.jwt.claim.sub','${admin}',false); select set_config('request.jwt.claim.role','authenticated',false); set role authenticated`,
  );
  await db.query("update jobs set last_date='2000-01-01' where id=$1", [emailJob.id]);
  await db.exec(
    "reset role; select set_config('request.jwt.claim.sub','',false); select set_config('request.jwt.claim.role','anon',false); set role anon",
  );
  assert.equal((await db.query('select * from jobs where id=$1', [emailJob.id])).rows.length, 0);
  assert.deepEqual(
    (await db.query('select apply_url,application_email from get_expired_job($1)', [emailJob.slug]))
      .rows,
    [{ apply_url: null, application_email: 'jobs@company.com' }],
    'the expired published-job RPC retains the new composite column safely',
  );
  await db.close();
});
