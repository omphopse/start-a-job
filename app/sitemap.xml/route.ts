import {site} from '@/lib/config';
export const dynamic='force-dynamic';
export function GET(){return new Response(`<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['jobs','categories','static'].map(name=>`<sitemap><loc>${site.url}/sitemaps/${name}.xml</loc></sitemap>`).join('')}</sitemapindex>`,{headers:{'Content-Type':'application/xml'}});}
