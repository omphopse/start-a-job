import { site } from './config';
export function otpEmailTemplate() {
  const name = site.name.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
  );
  return `<p>Your ${name} sign-in code is <strong>{{ .Token }}</strong>.</p><p>If you did not request this code, ignore this email.</p>`;
}
