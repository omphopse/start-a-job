import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
async function main() {
  loadEnvConfig(process.cwd());
  const email = z.email().parse(process.argv[2]);
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL)
    throw new Error('Set Supabase URL and service role key in .env.local first.');
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
  const existing = await db.from('profiles').select('id').eq('role', 'admin').limit(1);
  if (existing.error) throw existing.error;
  if (existing.data?.length)
    throw new Error('An admin already exists. Use admin user management instead.');
  const { data, error } = await db.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw error;
  const profile = await db
    .from('profiles')
    .insert({
      id: data.user.id,
      email,
      full_name: 'Site administrator',
      role: 'admin',
      is_active: true,
    });
  if (profile.error) {
    await db.auth.admin.deleteUser(data.user.id);
    throw profile.error;
  }
  console.log('Admin created. Sign in with an email OTP.');
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
