export const dynamic = 'force-dynamic';
export function GET() {
  return new Response(process.env.INDEXNOW_KEY || 'Not configured', {
    status: process.env.INDEXNOW_KEY ? 200 : 404,
    headers: { 'Content-Type': 'text/plain' },
  });
}
