'use server';
import { z } from 'zod';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { configured } from '@/lib/config';
import { serverDb } from '@/lib/supabase/server';
import { rateLimit, requestIdentity } from '@/lib/rate-limit';
export async function login(_state: { message: string; sent: boolean }, form: FormData) {
  const intent = form.get('intent');
  if (intent === 'change') return { message: '', sent: false };
  if (intent !== 'send' && intent !== 'verify')
    return { message: 'Choose Send OTP or Verify code.', sent: _state.sent };
  const parsed = z
    .object({
      email: z.email().max(254),
      token: z.string().regex(intent === 'verify' ? /^\d{6}$/ : /^$/),
    })
    .safeParse({ email: form.get('email'), token: intent === 'verify' ? form.get('token') : '' });
  if (!parsed.success)
    return {
      message: 'Enter a valid email and, when verifying, a six-digit code.',
      sent: _state.sent,
    };
  if (!configured)
    return {
      message: 'Sign-in is not configured yet. Connect Supabase using SETUP.md.',
      sent: false,
    };
  const { email, token } = parsed.data;
  try {
    const ip = requestIdentity(await headers());
    if (
      !(await rateLimit('otp-ip', ip, 10, 600)) ||
      !(await rateLimit(
        `otp-${token ? 'verify' : 'send'}`,
        email.toLowerCase(),
        token ? 8 : 3,
        600,
      ))
    )
      return {
        message: 'Too many attempts. Please wait ten minutes before trying again.',
        sent: _state.sent,
      };
    const db = await serverDb();
    if (!token) {
      await db.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
      return {
        message: 'If this email belongs to an approved account, a six-digit code is on its way.',
        sent: true,
      };
    }
    const { error } = await db.auth.verifyOtp({ email, token, type: 'email' });
    if (error)
      return {
        message: 'That code could not be verified. Check it or request a new code.',
        sent: true,
      };
  } catch {
    return {
      message: 'Sign-in is temporarily unavailable. Please try again shortly.',
      sent: _state.sent,
    };
  }
  redirect('/admin');
}
export async function logout() {
  if (configured) {
    const db = await serverDb();
    await db.auth.signOut();
  }
  redirect('/admin/login');
}
