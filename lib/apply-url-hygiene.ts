export function cleanApplyUrl(value: string): string {
  const url = new URL(value);
  url.hostname = url.hostname.replace(/\.+$/, '');
  for (const key of [...url.searchParams.keys()]) {
    if (
      /^(utm_|mc_|pk_|mtm_)/i.test(key) ||
      /^(fbclid|gclid|dclid|msclkid|ttclid|twclid|igshid|gbraid|wbraid|_ga|_gl|ref|referrer|referral|source|campaign|tracking|trackingid|trk|trkinfo|lever-source)$/i.test(
        key,
      )
    ) {
      url.searchParams.delete(key);
    }
  }
  return url.toString();
}
const aggregators = [
  'unstop.com',
  'naukri.com',
  'indeed.com',
  'indeed.co.in',
  'linkedin.com',
  'internshala.com',
  'shine.com',
  'foundit.in',
  'monster.com',
  'glassdoor.com',
  'ziprecruiter.com',
  'jooble.org',
  'timesjobs.com',
];
export function isJobAggregator(value: string): boolean {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return aggregators.some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}
