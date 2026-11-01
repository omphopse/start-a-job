'use server';
import { z } from 'zod';
import { revalidatePath, updateTag } from 'next/cache';
import { requireProfile } from '@/lib/auth';
import { serverDb } from '@/lib/supabase/server';
export async function addCategory(_state: { message: string }, form: FormData) {
  await requireProfile(true);
  const parsed = z.string().trim().min(2).max(80).safeParse(form.get('category_name'));
  if (!parsed.success) return { message: 'Enter a category name between 2 and 80 characters.' };
  const db = await serverDb();
  const { error } = await db.from('categories').insert({ name: parsed.data });
  if (error)
    return {
      message:
        error.code === '23505'
          ? 'That category already exists.'
          : 'Could not add category. Make sure migration 202610300002_categories_experience.sql has been applied.',
    };
  updateTag('categories');
  revalidatePath('/admin/jobs/[id]', 'page');
  revalidatePath('/jobs');
  return { message: `Category added: ${parsed.data}. Select it in the job form.` };
}
