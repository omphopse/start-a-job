import { z } from 'zod';
export const brandDefaults = {
  name: 'startajob',
  tagline: 'Your first step forward',
  url: 'http://localhost:3000',
  contactEmail: 'hello@example.com',
  mark: 's.',
  footerTagline: 'A little direction. A new beginning.',
  footerDescription: 'Find your first opportunity with confidence.',
  footerCredit: 'Made for new beginnings.',
} as const;
const publicConfig = z.object({ name: z.string().min(1), url: z.url() }).parse({
  name: process.env.NEXT_PUBLIC_SITE_NAME || brandDefaults.name,
  url: process.env.NEXT_PUBLIC_SITE_URL || brandDefaults.url,
});
export const site = {
  ...brandDefaults,
  ...publicConfig,
  url: publicConfig.url.replace(/\/+$/, ''),
  domain: new URL(publicConfig.url).hostname,
  contactEmail: process.env.CONTACT_EMAIL || brandDefaults.contactEmail,
};
export const configured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
