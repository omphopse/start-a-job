'use server';
import {z} from 'zod';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requireProfile} from '@/lib/auth';
import {serviceDb,serverDb} from '@/lib/supabase/server';
export async function addPoster(form:FormData){await requireProfile(true);const parsed=z.object({email:z.email().max(254),full_name:z.string().trim().min(2).max(100)}).safeParse(Object.fromEntries(form));if(!parsed.success)redirect('/admin/users?message=invalid');const db=serviceDb();const {data,error}=await db.auth.admin.createUser({email:parsed.data.email,email_confirm:true});if(error)redirect('/admin/users?message=create-failed');const result=await db.from('profiles').insert({id:data.user.id,...parsed.data,role:'poster',is_active:true});if(result.error){await db.auth.admin.deleteUser(data.user.id);redirect('/admin/users?message=create-failed');}revalidatePath('/admin/users');redirect('/admin/users?message=created');}
export async function togglePoster(form:FormData){await requireProfile(true);const parsed=z.object({id:z.uuid(),active:z.enum(['true','false'])}).safeParse(Object.fromEntries(form));if(!parsed.success)redirect('/admin/users?message=invalid');const db=await serverDb();const {error}=await db.from('profiles').update({is_active:parsed.data.active==='true'}).eq('id',parsed.data.id).eq('role','poster');if(error)redirect('/admin/users?message=failed');revalidatePath('/admin/users');}
