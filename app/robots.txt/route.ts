import { site } from '@/lib/config';
import { robotsText } from '@/lib/robots';
export const dynamic = 'force-dynamic';
export function GET() {
  return new Response(robotsText(site.url), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
