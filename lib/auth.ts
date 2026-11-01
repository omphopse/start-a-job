import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { configured } from './config';
import { serverDb } from './supabase/server';
import { requestPerformance } from './request-performance';
export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'poster';
  is_active: boolean;
};
const currentProfile = cache(async (): Promise<Profile> => {
  if (!configured) redirect('/admin/login?message=setup');
  const db = await serverDb();
  // getClaims verifies the signature locally with asymmetric signing keys;
  // Supabase falls back to server verification for legacy symmetric keys.
  const timing = requestPerformance();
  const { data, error } = await timing.measure('auth.verifyClaims', () => db.auth.getClaims());
  if (error || !data?.claims.sub) redirect('/admin/login');
  const { data: profile } = await timing.measure('query.activeProfile', () =>
    db
      .from('profiles')
      .select('id,email,full_name,role,is_active')
      .eq('id', data.claims.sub)
      .eq('is_active', true)
      .single(),
  );
  if (!profile) redirect('/admin/login?message=inactive');
  return profile as Profile;
});
export async function requireProfile(adminOnly = false): Promise<Profile> {
  const profile = await currentProfile();
  if (adminOnly && profile.role !== 'admin') redirect('/admin?message=forbidden');
  return profile;
}
