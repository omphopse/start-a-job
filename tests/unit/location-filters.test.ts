import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import {
  locationAliases,
  normalizeLocationName,
  normalizeFacets,
  resolveLocationFilters,
} from '../../lib/location-names';
import { parseFilters, jobInput } from '../../lib/validation';
import { apiQuery } from '../../lib/public-api';
import { sampleJobs } from '../../lib/sample-jobs';
import { PUBLIC_JOB_COLUMN_NAMES } from '../../lib/public-job-fields';
import { providerLocations } from '../../lib/location-provider';

test('shared location names normalize authoring, URLs, aliases and database facets', () => {
  assert.equal(normalizeLocationName('  BANGALORE  '), 'Bengaluru');
  assert.equal(normalizeLocationName('constructor'), 'constructor');
  assert.deepEqual(parseFilters({ state: '<script>', city: '' }), {});
  assert.deepEqual(parseFilters({ country: ' india ', state: ' maharashtra ', city: ' bombay ' }), {
    country: 'India',
    state: 'Maharashtra',
    city: 'Mumbai',
  });
  assert.equal(
    jobInput.parse({
      ...sampleJobs[0],
      location: ' Bangalore ',
      official_confirmed: 'on',
      no_fees: 'on',
    }).location,
    'Bengaluru',
  );
  const rows = normalizeFacets([
    { country: 'India', state: 'Karnataka', city: 'Bangalore', job_count: 2 },
    { country: ' india ', state: 'karnataka', city: 'Bengaluru', job_count: 1 },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].job_count, 3);
  assert.equal(resolveLocationFilters({ city: 'bengaluru' }, rows).city, 'Bengaluru');
  for (const value of ['x'.repeat(101), "'; drop table jobs;--", '%_()', '<script>', '\u0000']) {
    for (const key of ['country', 'state', 'city']) {
      assert.equal(apiQuery.safeParse({ [key]: value }).success, false);
      assert.equal(parseFilters({ [key]: value })[key as 'country'], undefined);
    }
  }
  assert.equal(parseFilters({ city: 'Unlisted City' }).city, 'Unlisted City');
});

test('CountriesNow server timeout falls back to cached normalized names', async (context) => {
  const mock = context.mock.method(globalThis, 'fetch', async () =>
    Response.json({ error: false, data: ['Bangalore', ' Bengaluru '] }),
  );
  assert.deepEqual(await providerLocations('cities', 'India', 'Karnataka'), ['Bengaluru']);
  const options = mock.mock.calls[0].arguments[1] as RequestInit & { next: { revalidate: number } };
  assert.equal(options.next.revalidate, 86400);
  assert.ok(options.signal);
  mock.mock.mockImplementation(async () => {
    throw new Error('Provider offline');
  });
  assert.deepEqual(await providerLocations('cities', 'India', 'Karnataka'), ['Bengaluru']);
});

test('migration 010 facets and list RPC preserve publication and column boundaries; rollback restores 008 RPC', async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role',true) $$; grant usage on schema public,auth to anon,authenticated,service_role;`,
    );
    // Supabase may grant service_role EXECUTE through default privileges.
    await db.exec(
      'alter default privileges in schema public grant execute on functions to service_role',
    );
    for (const file of readdirSync('supabase/migrations')
      .filter((name) => name.endsWith('.sql'))
      .sort())
      await db.exec(
        readFileSync(`supabase/migrations/${file}`, 'utf8').replace(
          'create extension if not exists pgcrypto;',
          '',
        ),
      );
    for (const [alias, canonical] of Object.entries(locationAliases)) {
      assert.equal(
        (
          await db.query<{ name: string }>('select public.normalize_job_location($1) as name', [
            `  ${alias.toUpperCase()}  `,
          ])
        ).rows[0].name,
        canonical,
      );
    }
    const poster = '00000000-0000-4000-8000-888888888888';
    await db.exec(
      `insert into auth.users values('${poster}'); insert into profiles(id,email,role) values('${poster}','poster@example.com','poster'); select set_config('request.jwt.claim.role','service_role',false);`,
    );
    for (const [i, status] of [
      'published',
      'published',
      'draft',
      'pending',
      'rejected',
      'unpublished',
      'published',
    ].entries()) {
      const job = {
        ...sampleJobs[0],
        id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
        slug: `location-fixture-${i}`,
        country: 'India',
        state: 'Karnataka',
        location: i === 1 ? 'Bangalore' : 'Bengaluru',
        created_by: poster,
        status,
        last_date: i === 6 ? '2020-01-01' : '2099-12-31',
      };
      const keys = Object.keys(job);
      await db.query(
        `insert into jobs(${keys.join(',')}) values(${keys.map((_, n) => `$${n + 1}`).join(',')})`,
        Object.values(job),
      );
    }
    await db.exec("set role anon; select set_config('request.jwt.claim.role','anon',false)");
    const facets = await db.query('select * from public_job_location_facets()');
    assert.deepEqual(facets.rows, [
      { country: 'India', state: 'Karnataka', city: 'Bengaluru', job_count: 2 },
    ]);
    const jobs = await db.query<Record<string, unknown>>(
      'select * from search_public_jobs(null,$1,$2,$3)',
      [' INDIA ', ' karnataka ', 'Bangalore'],
    );
    assert.equal(jobs.rows.length, 2);
    assert.deepEqual(Object.keys(jobs.rows[0]).sort(), [...PUBLIC_JOB_COLUMN_NAMES].sort());
    for (const key of [
      'created_by',
      'approved_by',
      'rejection_reason',
      'search_document',
      'status',
      'created_at',
      'updated_at',
    ])
      await assert.rejects(db.query(`select ${key} from jobs`), /permission denied/);
    for (const value of [
      'Unlisted City',
      "'; drop table jobs;--",
      'x'.repeat(10001),
      '%_()',
      '<script>',
    ]) {
      assert.equal(
        (await db.query('select * from search_public_jobs(null,$1,$1,$1)', [value])).rows.length,
        0,
      );
    }
    await assert.rejects(
      db.query('select created_by from public_job_location_facets(1)'),
      /does not exist/,
    );
    // Unknown named inputs are rejected at the function boundary, never interpreted as SQL.
    for (const name of ['qualification', 'experience_level']) {
      await assert.rejects(
        db.query(`select * from search_public_jobs(p_${name} => $1)`, ['ignored']),
        (error: unknown) => (error as { code: string }).code === '42883',
      );
    }
    await db.exec('reset role');
    const columns = [...Object.keys(sampleJobs[0]), 'country'];
    const values = columns.map((key) =>
      key === 'id'
        ? "('10000000-0000-4000-8000-' || lpad(g::text,12,'0'))::uuid"
        : key === 'slug'
          ? "'facet-cap-' || g"
          : key === 'location'
            ? "'Fixture City ' || g"
            : `j.${key}`,
    );
    await db.exec(
      `select set_config('request.jwt.claim.role','service_role',false); insert into jobs(${columns.join(',')}) select ${values.join(',')} from jobs j cross join generate_series(1,510) g where j.slug='location-fixture-0'; set role anon;`,
    );
    for (const [limit, expected] of [
      [null, 500],
      [1, 1],
      [0, 1],
      [-99, 1],
      [2147483647, 500],
      [20, 20],
    ]) {
      const capped = await db.query<Record<string, unknown>>(
        'select * from public_job_location_facets($1)',
        [limit],
      );
      assert.equal(capped.rows.length, expected);
      assert.deepEqual(Object.keys(capped.rows[0]).sort(), [
        'city',
        'country',
        'job_count',
        'state',
      ]);
    }
    await assert.rejects(
      db.query('select * from public_job_location_facets($1)', ['1; select created_by from jobs']),
      (error: unknown) => (error as { code: string }).code === '22P02',
    );
    await db.exec('reset role; create role facet_outsider; set role facet_outsider');
    await assert.rejects(
      db.query('select * from public_job_location_facets()'),
      /permission denied/,
    );
    await db.exec(
      "reset role; set role authenticated; select set_config('request.jwt.claim.role','authenticated',false)",
    );
    assert.equal((await db.query('select * from public_job_location_facets()')).rows.length, 500);
    await db.exec("reset role; delete from jobs where slug like 'facet-cap-%'");
    const settings = await db.query<{ prosecdef: boolean; proconfig: string[] }>(
      "select prosecdef,proconfig from pg_proc where oid='public.public_job_location_facets(integer)'::regprocedure",
    );
    assert.equal(settings.rows[0].prosecdef, true);
    assert.deepEqual(settings.rows[0].proconfig, ['search_path=pg_catalog, pg_temp']);
    const privileges = await db.query<{ role: string; allowed: boolean }>(
      `select rolname as role, has_function_privilege(rolname,'public.public_job_location_facets(integer)','execute') as allowed from pg_roles where rolname in ('anon','authenticated')`,
    );
    assert.ok(privileges.rows.every((row) => row.allowed));
    const servicePrivilege = await db.query<{ allowed: boolean }>(
      "select has_function_privilege('service_role','public.public_job_location_facets(integer)','execute') as allowed",
    );
    assert.equal(servicePrivilege.rows[0].allowed, false);
    await db.exec(
      readFileSync('supabase/rollbacks/202611020010_public_location_filters.sql', 'utf8'),
    );
    await db.exec('set role anon');
    assert.equal((await db.query('select * from search_public_jobs(null)')).rows.length, 2);
  } finally {
    await db.close();
  }
});
