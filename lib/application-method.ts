import { z } from 'zod';

export const applicationFormatMessage =
  'Enter one official HTTPS application URL or one valid email address, such as https://company.com/careers/job-123 or hr@company.com.';

export const applicationUrl = z
  .string()
  .trim()
  .refine(
    (value) => !/[\u0000-\u0020\u007f\\]/.test(value),
    'Application URLs cannot contain whitespace, control characters or backslashes.',
  )
  .pipe(z.url().max(2000))
  .superRefine((value, ctx) => {
    // Zod can run this refinement after a non-fatal URL-format issue. Invalid
    // user input must stay a validation result rather than throw from URL().
    let u: URL;
    try {
      u = new URL(value);
    } catch {
      ctx.addIssue({ code: 'custom', message: 'Enter a valid official HTTPS URL.' });
      return;
    }
    const blocked = [
      'wa.me',
      't.me',
      'telegram.me',
      'whatsapp.com',
      'bit.ly',
      'tinyurl.com',
      ...(process.env.APPLY_HOST_BLOCKLIST || '')
        .split(',')
        .map((host) => host.trim().toLowerCase())
        .filter(Boolean),
    ];
    if (
      u.protocol !== 'https:' ||
      !/^https:\/\/[^/\\\s]/i.test(value) ||
      /[\u0000-\u0020\u007f\\]/.test(value) ||
      u.username ||
      u.password ||
      u.port ||
      !u.hostname.includes('.') ||
      /^\d+\.\d+\.\d+\.\d+$/.test(u.hostname) ||
      u.hostname.startsWith('[') ||
      u.hostname.endsWith('.local') ||
      blocked.some((host) => u.hostname === host || u.hostname.endsWith(`.${host}`))
    )
      ctx.addIssue({
        code: 'custom',
        message:
          'Use an official HTTPS company/government URL, without credentials, ports, shorteners or messaging links.',
      });
  })
  .transform((value) => value.replace(/^https:/i, 'https:'));

export const applicationEmail = z
  .string()
  .trim()
  .pipe(z.email().max(254))
  .refine(
    (value) => value.slice(0, value.lastIndexOf('@')).length <= 64,
    'Enter a valid application email address.',
  )
  .transform((value) => {
    const at = value.lastIndexOf('@');
    // Preserve the local part, including case and plus addressing.
    return value.slice(0, at + 1) + value.slice(at + 1).toLowerCase();
  });

export type ApplicationFields = { apply_url: string | null; application_email: string | null };
export const applicationInput = z
  .string()
  .trim()
  .min(1, applicationFormatMessage)
  .max(2000)
  .transform((value, ctx): ApplicationFields => {
    // Protocol-looking input must pass URL validation; never reinterpret an
    // unsafe/malformed URL containing @ as an email address.
    if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.includes('://')) {
      const result = applicationUrl.safeParse(value);
      if (result.success) return { apply_url: result.data, application_email: null };
      ctx.addIssue({
        code: 'custom',
        message: `${applicationFormatMessage} HTTPS links must not use credentials, ports, shorteners or messaging services.`,
      });
    } else {
      const result = applicationEmail.safeParse(value);
      if (result.success) return { apply_url: null, application_email: result.data };
      ctx.addIssue({ code: 'custom', message: applicationFormatMessage });
    }
    return z.NEVER;
  });

export function getApplicationMethod(job: {
  apply_url?: string | null;
  application_email?: string | null;
}) {
  const url = job.apply_url?.trim();
  const email = job.application_email?.trim();
  if (Boolean(url) === Boolean(email)) return null;
  if (url) {
    const result = applicationUrl.safeParse(url);
    return result.success ? { kind: 'url' as const, url: result.data } : null;
  }
  const result = applicationEmail.safeParse(email);
  return result.success ? { kind: 'email' as const, email: result.data } : null;
}

export function applicationMailto(email: string, title?: string, company?: string) {
  const recipient = applicationEmail.parse(email);
  const href = `mailto:${encodeURIComponent(recipient).replace('%40', '@')}`;
  return title && company
    ? `${href}?subject=${encodeURIComponent(`Application for ${title} – ${company}`.replace(/[\r\n]+/g, ' '))}`
    : href;
}
