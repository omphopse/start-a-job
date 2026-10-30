'use server';
import {z} from 'zod';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requireProfile} from '@/lib/auth';
import {serverDb} from '@/lib/supabase/server';
export async function saveLanding(form:FormData){await requireProfile(true);const input=z.object({path:z.string().max(220).regex(/^\/jobs\/(?:category\/[a-z0-9-]+(?:\/location\/[a-z0-9-]+)?|location\/[a-z0-9-]+)$/),intro:z.string().trim().min(20).max(2000)}).safeParse(Object.fromEntries(form));if(!input.success)redirect('/admin/landing-pages?message=invalid');const {error}=await (await serverDb()).from('landing_pages').upsert({...input.data,updated_at:new Date().toISOString()});if(error)redirect('/admin/landing-pages?message=failed');revalidatePath(input.data.path);revalidatePath('/admin/landing-pages');redirect('/admin/landing-pages?message=saved');}
