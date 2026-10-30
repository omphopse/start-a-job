import {z} from 'zod';
const publicConfig = z.object({name:z.string().min(1),url:z.url()}).parse({name:process.env.NEXT_PUBLIC_SITE_NAME || 'DeskJobs',url:process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'});
export const site = publicConfig;
export const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
