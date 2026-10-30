import { parseFilters } from '../validation';
import type { Filters } from '../data';
import { landingData } from '../landing';
import { metadata } from './metadata';
export async function landingMetadata(
  category: string | undefined,
  location: string | undefined,
  filters: Filters,
) {
  filters = parseFilters(filters);
  const data = await landingData(category, location, filters);
  if (!data) return {};
  const query = new URLSearchParams(filters).toString();
  return metadata(
    data.title,
    data.intro,
    data.noindex ? data.parent : data.path + (query ? `?${query}` : ''),
    data.noindex,
  );
}
