// Opportunistic per-worker cache for public deletion markers. Correctness does
// not depend on workers sharing memory: every entry has a short hard expiry.
export function createTombstoneCache(
  load: (slug: string) => Promise<boolean>,
  ttlMs = 10_000,
  capacity = 1024,
  now = () => performance.now(),
) {
  const entries = new Map<string, { expires: number; value: Promise<boolean> }>();
  return {
    clear(slug?: string) {
      if (slug) entries.delete(slug);
      else entries.clear();
    },
    async read(slug: string): Promise<boolean> {
      const existing = entries.get(slug);
      if (existing && existing.expires > now()) return existing.value;
      entries.delete(slug);
      if (entries.size >= capacity) entries.delete(entries.keys().next().value!);
      const entry = { expires: now() + ttlMs, value: Promise.resolve(false) };
      entry.value = load(slug).catch((error) => {
        // Failed lookups must never be cached as "not deleted".
        if (entries.get(slug) === entry) entries.delete(slug);
        throw error;
      });
      entries.set(slug, entry);
      return entry.value;
    },
  };
}
