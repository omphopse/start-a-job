import { site } from './lib/config';
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/ui',
  fullyParallel: true,
  use: { baseURL: process.env.TEST_BASE_URL || 'http://localhost:3100' },
  projects: [
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } } },
    { name: 'tablet', use: { viewport: { width: 768, height: 1024 } } },
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: process.env.TEST_BASE_URL
    ? undefined
    : {
        command:
          process.env.TEST_WEBPACK === 'true'
            ? 'npm run dev -- --webpack --port 3100'
            : 'npm run dev -- --port 3100',
        url: 'http://localhost:3100',
        reuseExistingServer: false,
        env: {
          NEXT_PUBLIC_SITE_NAME: site.name,
          NEXT_PUBLIC_APPLY_DELAY_SECONDS: '2',
          DEMO_MODE: 'true',
          PLAYWRIGHT_TEST: 'true',
          NEXT_PUBLIC_SUPABASE_URL: '',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
          SUPABASE_SERVICE_ROLE_KEY: '',
        },
      },
});
