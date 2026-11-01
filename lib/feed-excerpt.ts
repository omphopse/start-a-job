export function feedExcerpt(summary: string): string {
  return Array.from(
    summary
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  )
    .slice(0, 300)
    .join('');
}
