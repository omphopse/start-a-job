import { z } from 'zod';
import { configured } from '@/lib/config';
import { publicDb } from '@/lib/supabase/public';
import { rateLimit, requestIdentity } from '@/lib/rate-limit';
export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > 500) return Response.json({ error: 'Request too large' }, { status: 413 });
    const parsed = z.object({ job_id: z.uuid() }).strict().safeParse(JSON.parse(raw));
    if (!parsed.success) return Response.json({ error: 'Invalid job' }, { status: 400 });
    if (!(await rateLimit('click', requestIdentity(request.headers), 30, 60)))
      return Response.json({ error: 'Please wait' }, { status: 429 });
    if (!configured) return Response.json({ demo: true, recorded: false });
    const { error } = await publicDb().rpc('log_apply_click', { p_job_id: parsed.data.job_id });
    if (error) throw error;
    return Response.json({ recorded: true });
  } catch {
    return Response.json({ error: 'Could not record click' }, { status: 400 });
  }
}
