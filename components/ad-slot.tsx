export function AdSlot() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  if (!client) return null;
  return (
    <aside className="ad-slot" aria-label="Advertisement">
      <span>Advertisement</span>
      <div data-ad-client={client} style={{ minHeight: 120 }} />
    </aside>
  );
}
