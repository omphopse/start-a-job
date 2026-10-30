'use server';
import { after } from 'next/server';
import { notify } from '@/lib/seo/notify';
import { site } from '@/lib/config';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { requireProfile } from '@/lib/auth';
import { serverDb } from '@/lib/supabase/server';
import { jobInput } from '@/lib/validation';
import { refreshJobs } from '@/lib/revalidate';
export async function reviewJob(form: FormData) {
  const profile = await requireProfile(true);
  const input = z
    .object({
      id: z.uuid(),
      intent: z.enum(['approve', 'reject', 'unpublish', 'delete']),
      reason: z.string().max(1000),
    })
    .safeParse({
      id: form.get('id'),
      intent: form.get('intent'),
      reason: form.get('reason') || '',
    });
  if (!input.success) redirect('/admin?message=invalid');
  const { id, intent, reason } = input.data;
  const db = await serverDb();
  const { data: job, error } = await db.from('jobs').select('*').eq('id', id).single();
  if (error || !job) redirect('/admin?message=not-found');
  if (intent === 'reject' && reason.trim().length < 5) redirect('/admin?message=reason-required');
  if (intent === 'approve') {
    if (job.status !== 'pending') redirect('/admin?message=not-pending');
    const valid = jobInput.safeParse({
      ...job,
      last_date: job.last_date || '',
      vacancies: job.vacancies ?? '',
      official_confirmed: form.get('official_confirmed'),
      no_fees: form.get('no_fees'),
    });
    if (!valid.success) redirect(`/admin/jobs/${id}?message=check-fields`);
  }
  if (intent === 'delete' && form.get('confirm_delete') !== 'on')
    redirect('/admin?message=confirm-delete');
  const result =
    intent === 'delete'
      ? await db.from('jobs').delete().eq('id', id)
      : await db
          .from('jobs')
          .update(
            intent === 'approve'
              ? { status: 'published', approved_by: profile.id, rejection_reason: null }
              : intent === 'reject'
                ? { status: 'rejected', rejection_reason: reason.trim(), approved_by: null }
                : { status: 'unpublished' },
          )
          .eq('id', id);
  if (result.error) redirect('/admin?message=failed');
  refreshJobs(job.slug);
  if (intent === 'approve' || job.published_at)
    after(() =>
      notify(site.url + '/jobs/' + job.slug, intent === 'approve' ? 'URL_UPDATED' : 'URL_DELETED'),
    );
  redirect('/admin?message=updated');
}
