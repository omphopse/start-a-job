export type SiteEnvironment = 'local' | 'staging' | 'production';
type Environment = Record<string, string | undefined>;
export function siteEnvironment(env: Environment = process.env): SiteEnvironment {
  const value = env.SITE_ENV || (env.NODE_ENV === 'production' ? 'production' : 'local');
  if (!['local', 'staging', 'production'].includes(value))
    throw new Error('SITE_ENV must be local, staging or production.');
  return value as SiteEnvironment;
}
export function assertDeploymentEnvironment(env: Environment = process.env) {
  if (siteEnvironment(env) !== 'production') return;
  if (!env.NEXT_PUBLIC_SITE_URL) throw new Error('Production requires NEXT_PUBLIC_SITE_URL.');
  let url: URL;
  try {
    url = new URL(env.NEXT_PUBLIC_SITE_URL);
  } catch {
    throw new Error('Production requires a valid NEXT_PUBLIC_SITE_URL.');
  }
  if (
    url.protocol !== 'https:' ||
    /^(localhost|127(?:\.\d+){3}|0\.0\.0\.0|\[::1\])$|\.localhost$/i.test(url.hostname) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  )
    throw new Error(
      'Production NEXT_PUBLIC_SITE_URL must be an HTTPS site origin, never localhost.',
    );
  if (env.DEMO_MODE !== 'false') throw new Error('Production requires DEMO_MODE=false.');
  if (Number(env.NEXT_PUBLIC_APPLY_DELAY_SECONDS || '10') !== 10)
    throw new Error('Production apply delay must be 10 seconds.');
}
export function robotsPolicy(noindex: boolean, environment = siteEnvironment()) {
  return { index: !noindex && environment !== 'staging', follow: environment !== 'staging' };
}
export function environmentHeaders(environment = siteEnvironment()) {
  return environment === 'staging' ? [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] : [];
}
