'use server';
import { z } from 'zod';
import { headers } from 'next/headers';
import { getJob, demo } from '@/lib/data';
import { isCurrent } from '@/lib/jobs';
import { serviceDb } from '@/lib/supabase/server';
import { rateLimit, requestIdentity } from '@/lib/rate-limit';
export async function reportJob(_state: { message: string; success: boolean }, form: FormData) {
  const parsed = z
    .object({
      slug: z
        .string()
        .regex(/^[a-z0-9-]+$/)
        .max(200),
      reason: z.string().trim().min(5).max(1000),
      website: z.literal(''),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { message: 'Please give a reason between 5 and 1,000 characters.', success: false };
  try {
    if (!(await rateLimit('report', requestIdentity(await headers()), 5, 3600)))
      return { message: 'Too many reports. Please try again in an hour.', success: false };
    const job = await getJob(parsed.data.slug);
    if (!job || !isCurrent(job))
      return { message: 'This listing is no longer available for reporting.', success: false };
    if (demo())
      return {
        message: 'Preview only — no report was saved. Live reports become available after setup.',
        success: false,
      };
    const { error } = await serviceDb()
      .from('job_reports')
      .insert({ job_id: job.id, reason: parsed.data.reason });
    if (error) throw error;
    return { message: 'Thank you. Your report has been sent for admin review.', success: true };
  } catch {
    return { message: 'Your report could not be sent. Please try again shortly.', success: false };
  }
}
