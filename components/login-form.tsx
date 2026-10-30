'use client';
import { useActionState, useState } from 'react';
import { login } from '@/app/admin/login/actions';
export function LoginForm() {
  const [state, action, pending] = useActionState(login, { message: '', sent: false });
  const [email, setEmail] = useState('');
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
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          readOnly={state.sent}
        />
      </label>
      {state.sent && (
        <label>
          Six-digit code
          <input
            name="token"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            autoComplete="one-time-code"
            placeholder="000000"
            required
          />
        </label>
      )}
      <button
        className="button"
        name="intent"
        value={state.sent ? 'verify' : 'send'}
        disabled={pending}
      >
        {pending ? 'Please wait…' : state.sent ? 'Verify code & sign in →' : 'Send OTP →'}
      </button>
      {state.sent && (
        <>
          <button
            className="button secondary"
            name="intent"
            value="send"
            formNoValidate
            disabled={pending}
          >
            Resend OTP
          </button>
          <button
            className="button secondary"
            name="intent"
            value="change"
            formNoValidate
            disabled={pending}
          >
            Change email address
          </button>
        </>
      )}
      {state.message && (
        <p role="status" className="form-message">
          {state.message}
        </p>
      )}
      <p className="form-help">Only pre-approved admin and poster accounts can sign in.</p>
    </form>
  );
}
