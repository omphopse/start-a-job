'use client';
import { useActionState } from 'react';
import { login } from '@/app/admin/login/actions';
export function LoginForm() {
  const [state, action, pending] = useActionState(login, { message: '', sent: false });
  return (
    <form action={action} className="login-form">
      <label>
        Email address
        <input
          name="email"
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
          required
          maxLength={254}
        />
      </label>
      <label>
        Six-digit code <span>(after requesting a code)</span>
        <input
          name="token"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          autoComplete="one-time-code"
          placeholder="000000"
        />
      </label>
      <button className="button" disabled={pending}>
        {pending ? 'Please wait…' : state.sent ? 'Verify code & sign in →' : 'Send sign-in code →'}
      </button>
      {state.message && (
        <p role="status" className="form-message">
          {state.message}
        </p>
      )}
      <p className="form-help">
        Leave the code blank to request a new one. Only pre-approved admin and poster accounts can
        sign in.
      </p>
    </form>
  );
}
