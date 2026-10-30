import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { sampleJobs } from '../lib/sample-jobs';
async function main() {
  loadEnvConfig(process.cwd());
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    throw new Error('Configure Supabase before running the sample seed.');
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const { data: admin, error } = await db
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .eq('is_active', true)
    .limit(1)
    .single();
  if (error || !admin) throw new Error('Create an admin before seeding.');
  const result = await db.from('jobs').upsert(
    sampleJobs.map((j) => ({ ...j, created_by: admin.id, approved_by: admin.id })),
    { onConflict: 'slug' },
  );
  if (result.error) throw result.error;
  console.log('Seeded 10 explicitly labelled fictional jobs. Remove before launch.');
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
