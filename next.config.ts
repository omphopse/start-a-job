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
