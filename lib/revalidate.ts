import 'server-only';
import {revalidatePath} from 'next/cache';
export function refreshJobs(slug?:string){for(const path of ['/','/jobs','/admin','/sitemap.xml','/sitemaps/jobs.xml','/sitemaps/categories.xml','/feed.xml','/api/public/jobs.json'])revalidatePath(path);if(slug)revalidatePath(`/jobs/${slug}`);revalidatePath('/jobs/category/[category]','page');revalidatePath('/jobs/location/[location]','page');revalidatePath('/jobs/category/[category]/location/[location]','page');}
