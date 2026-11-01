'use client';

import { useEffect, useState } from 'react';
import { applicationMailto } from '@/lib/application-method';

export function EmailApplyPanel({
  email,
  title,
  company,
  delay,
}: {
  email: string;
  title: string;
  company: string;
  delay: number;
}) {
  const [remaining, setRemaining] = useState(delay);
  useEffect(() => {
    const end = Date.now() + delay * 1000;
    const timer = setInterval(() => {
      const next = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setRemaining(next);
      if (next === 0) clearInterval(timer);
    }, 200);
    return () => clearInterval(timer);
  }, [delay]);

  return (
    <section className="apply-panel" aria-labelledby="email-apply-heading">
      <div className="apply-symbol" aria-hidden="true">
        ✉
      </div>
      <div>
        <h2 id="email-apply-heading">Apply via email</h2>
        {remaining === 0 && (
          <p>
            Send your application to: <a href={applicationMailto(email)}>{email}</a>
          </p>
        )}
        <p className="safety-note">Never pay money to apply.</p>
        <p className="countdown-message" aria-live="polite" aria-atomic="true">
          {remaining > 0
            ? `Take a moment to review the requirements. Email available in ${remaining} seconds.`
            : 'Ready when you are. Send your application using your email app.'}
        </p>
        <progress
          max={Math.max(1, delay)}
          value={delay - remaining}
          aria-label="Application email countdown"
        />
        {remaining > 0 ? (
          <button className="button apply-link waiting" disabled>
            Send Application (available in {remaining}s)
          </button>
        ) : (
          <a className="button apply-link" href={applicationMailto(email, title, company)}>
            Send Application
          </a>
        )}
      </div>
    </section>
  );
}
