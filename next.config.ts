import { assertDeploymentEnvironment, environmentHeaders } from './lib/environment';
assertDeploymentEnvironment();
import type { NextConfig } from 'next';
const config: NextConfig = {
  distDir: process.env.PLAYWRIGHT_TEST === 'true' ? '.next-test' : '.next',
  devIndicators: false,
  poweredByHeader: false,
  // Bound the CDN stale window for public ISR pages (Next defaults to a year).
  expireTime: 60,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          ...environmentHeaders(),
          // Baseline directives preserve cached Next.js inline scripts and the
          // optional ad integration. A strict script policy needs nonces/hashes
          // and a separate deployment review; this is not an XSS sandbox.
          {
            key: 'Content-Security-Policy',
            value: "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'",
          },
          // Browsers honor HSTS only over HTTPS. Do not includeSubDomains before
          // the owner's other subdomains have been verified for HTTPS.
          { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};
export default config;
