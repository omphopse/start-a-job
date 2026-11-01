// Read-only profiling of the configured public backend, with no Next cache.
// Usage: npx tsx scripts/profile-public-job.ts <public-slug>
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_JOB_COLUMNS, type PublicJob } from '../lib/public-job-fields';
import { today } from '../lib/jobs';

async function main() {
  for (const file of ['.env', '.env.local']) if (existsSync(file)) process.loadEnvFile(file);
  const slug = process.argv[2];
  if (!slug || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    throw new Error(
      'Supply a public slug and configure the public Supabase environment variables.',
    );
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const samples: {
    operation: string;
    attempt: number;
    duration_ms: number;
    ok: boolean;
    rows: number;
  }[] = [];
  for (let attempt = 1; attempt <= 5; attempt++) {
    let start = performance.now();
    // Disable retries only in this diagnostic: failures should identify a
    // single attempt rather than measure retry backoff as database latency.
    const deleted = await db
      .from('deleted_jobs')
      .select('slug')
      .eq('slug', slug)
      .abortSignal(AbortSignal.timeout(10_000))
      .maybeSingle()
      .retry(false);
    samples.push({
      operation: 'query.deletedJob',
      attempt,
      duration_ms: performance.now() - start,
      ok: !deleted.error,
      rows: deleted.data ? 1 : 0,
    });
    if (deleted.error) break;
    start = performance.now();
    const job = await db
      .rpc('search_public_jobs', { p_query: null })
      .select(PUBLIC_JOB_COLUMNS)
      .eq('slug', slug)
      .abortSignal(AbortSignal.timeout(10_000))
      .maybeSingle()
      .retry(false);
    samples.push({
      operation: 'query.publicJob',
      attempt,
      duration_ms: performance.now() - start,
      ok: !job.error,
      rows: job.data ? 1 : 0,
    });
    if (job.error) break;
    if (!job.data) continue;
    start = performance.now();
    const similar = await db
      .rpc('search_public_jobs', { p_query: null })
      .select(PUBLIC_JOB_COLUMNS)
      .eq('category', (job.data as unknown as PublicJob).category)
      .or(`last_date.is.null,last_date.gte.${today()}`)
      .order('published_at', { ascending: false })
      .limit(4)
      .abortSignal(AbortSignal.timeout(10_000))
      .retry(false);
    samples.push({
      operation: 'query.similarJobs',
      attempt,
      duration_ms: performance.now() - start,
      ok: !similar.error,
      rows: similar.data?.length || 0,
    });
    if (similar.error) break;
  }
  const result = {
    environment:
      'configured Supabase project; anonymous read-only SDK queries from this machine; not deployed request timings',
    retries: false,
    samples,
  };
  await mkdir('verification', { recursive: true });
  await writeFile('verification/public-network.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}
main().catch(() => {
  console.error('Public backend profiling failed; no credential or error payload was logged.');
  process.exitCode = 1;
});
