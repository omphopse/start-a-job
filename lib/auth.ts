import 'server-only';
import { redirect } from 'next/navigation';
import { configured } from './config';
import { serverDb } from './supabase/server';
export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'poster';
  is_active: boolean;
};
export async function requireProfile(adminOnly = false): Promise<Profile> {
  if (!configured) redirect('/admin/login?message=setup');
  const db = await serverDb();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) redirect('/admin/login');
  const { data: profile } = await db
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .eq('is_active', true)
    .single();
  if (!profile) redirect('/admin/login?message=inactive');
  if (adminOnly && profile.role !== 'admin') redirect('/admin?message=forbidden');
  return profile as Profile;
}
