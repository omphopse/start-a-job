'use server';
import {z} from 'zod';
import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {configured} from '@/lib/config';
import {serverDb} from '@/lib/supabase/server';
import {rateLimit,requestIdentity} from '@/lib/rate-limit';
export async function login(_state:{message:string;sent:boolean},form:FormData){const parsed=z.object({email:z.email().max(254),token:z.string().regex(/^\d{6}$/).or(z.literal(''))}).safeParse({email:form.get('email'),token:form.get('token')||''});if(!parsed.success)return {message:'Enter a valid email and a six-digit code if provided.',sent:false};if(!configured)return {message:'Sign-in is not configured yet. Connect Supabase using SETUP.md.',sent:false};const {email,token}=parsed.data;try{const ip=requestIdentity(await headers());if(!await rateLimit('otp-ip',ip,10,600)||!await rateLimit(`otp-${token?'verify':'send'}`,email.toLowerCase(),token?8:3,600))return {message:'Too many attempts. Please wait ten minutes before trying again.',sent:!token};const db=await serverDb();if(!token){await db.auth.signInWithOtp({email,options:{shouldCreateUser:false}});return {message:'If this email belongs to an approved account, a six-digit code is on its way.',sent:true};}const {error}=await db.auth.verifyOtp({email,token,type:'email'});if(error)return {message:'That code could not be verified. Check it or request a new code.',sent:true};}catch{return {message:'Sign-in is temporarily unavailable. Please try again shortly.',sent:false};}redirect('/admin');}
export async function logout(){if(configured){const db=await serverDb();await db.auth.signOut();}redirect('/admin/login');}
