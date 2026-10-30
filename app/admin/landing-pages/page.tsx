import Link from 'next/link';
import { requireProfile } from '@/lib/auth';
import { serverDb } from '@/lib/supabase/server';
import { saveLanding } from './actions';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Landing page introductions',
  robots: { index: false, follow: false },
};
export default async function LandingAdmin() {
  await requireProfile(true);
  const { data, error } = await (await serverDb()).from('landing_pages').select('*').order('path');
  if (error) throw error;
  return (
    <div className="container section prose">
      <Link href="/admin">← Dashboard</Link>
      <h1 className="admin-page-title">A useful first impression.</h1>
      <p>
        Set a unique introduction for a category or location landing page. Existing paths are
        overwritten when saved.
      </p>
      <form action={saveLanding} className="login-form">
        <label>
          Landing path
          <input name="path" placeholder="/jobs/category/accounts/location/pune" required />
        </label>
        <label>
          Introduction
          <textarea name="intro" minLength={20} maxLength={2000} rows={6} required />
        </label>
        <button className="button">Save introduction</button>
      </form>
      {data.map((l) => (
        <section key={l.path}>
          <h2>{l.path}</h2>
          <p>{l.intro}</p>
        </section>
      ))}
    </div>
  );
}
