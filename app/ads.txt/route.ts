export const dynamic = 'force-dynamic';
export function GET() {
  return new Response(process.env.ADS_TXT || '', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
