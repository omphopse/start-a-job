'use server';
import { after } from 'next/server';
import { notify } from '@/lib/seo/notify';
import { site } from '@/lib/config';

import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireProfile } from '@/lib/auth';
import { serverDb } from '@/lib/supabase/server';
import { jobInput, makeSlug } from '@/lib/validation';
import { refreshJobs } from '@/lib/revalidate';
export async function saveJob(_state: { message: string }, form: FormData) {
  const profile = await requireProfile();
  const parsed = jobInput.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      message: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(' · '),
    };
  const intent = z.enum(['draft', 'pending', 'published']).safeParse(form.get('intent'));
  if (!intent.success || (profile.role !== 'admin' && intent.data === 'published'))
    return { message: 'Only an admin can publish jobs.' };
  const idInput = z
    .uuid()
    .or(z.literal(''))
    .safeParse(form.get('id') || '');
  if (!idInput.success) return { message: 'Invalid job identifier.' };
  const db = await serverDb();
  const id = idInput.data || randomUUID();
  const existing = idInput.data ? await db.from('jobs').select('*').eq('id', id).single() : null;
  if (existing?.error) return { message: 'Job not found or access denied.' };
  const row = existing?.data;
  if (
    profile.role === 'poster' &&
    row &&
    (row.created_by !== profile.id || !['draft', 'pending', 'rejected'].includes(row.status))
  )
    return { message: 'You can edit only your own drafts, pending or rejected jobs.' };
  const { official_confirmed, no_fees, ...fields } = parsed.data;
  void official_confirmed;
  void no_fees;
  const values = {
    ...fields,
    status: intent.data,
    ...(!row
      ? {
          id,
          slug: makeSlug(fields.title, fields.company_name, fields.location, id),
          created_by: profile.id,
        }
      : {}),
    ...(profile.role === 'admin' && intent.data === 'published'
      ? { approved_by: profile.id, rejection_reason: null }
      : {}),
  };
  const result = row
    ? await db.from('jobs').update(values).eq('id', id).select('id').single()
    : await db.from('jobs').insert(values).select('id').single();
  if (result.error) return { message: 'Could not save this job. Check the details and try again.' };
  const publicSlug = row?.slug || ('slug' in values ? (values.slug as string) : '');
  if (intent.data === 'published' || row?.status === 'published')
    after(() =>
      notify(
        site.url + '/jobs/' + publicSlug,
        intent.data === 'published' ? 'URL_UPDATED' : 'URL_DELETED',
      ),
    );
  refreshJobs(row?.slug || ('slug' in values ? (values.slug as string) : undefined));
  redirect('/admin?message=saved');
}
