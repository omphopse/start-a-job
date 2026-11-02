import { z } from 'zod';
import { normalizeLocationName, locationName } from './location-names';

// Server adapter shared by the authoring proxy. Public facets never need this network call.
const previous = new Map<string, { options: string[]; expires: number }>();
export async function providerLocations(
  kind: string,
  country?: string,
  state?: string,
): Promise<string[]> {
  const path =
    kind === 'countries'
      ? 'iso'
      : kind === 'states'
        ? 'states/q'
        : state
          ? 'state/cities/q'
          : 'cities/q';
  const query = new URLSearchParams({
    ...(country ? { country } : {}),
    ...(state ? { state } : {}),
  });
  const url = `https://countriesnow.space/api/v0.1/countries/${path}?${query}`;
  const old = previous.get(url);
  try {
    const response = await fetch(url, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(2000),
    });
    if (!response.ok) throw new Error('Location provider unavailable');
    const payload = await response.json();
    if (payload.error) throw new Error('Invalid location response');
    const options =
      kind === 'cities'
        ? z.array(locationName).parse(payload.data)
        : z
            .array(z.object({ name: locationName }))
            .parse(kind === 'states' ? payload.data.states : payload.data)
            .map((item) => item.name);
    const result = [...new Set(options.map(normalizeLocationName))].sort((a, b) =>
      a.localeCompare(b),
    );
    if (previous.size >= 256) previous.delete(previous.keys().next().value!);
    previous.set(url, { options: result, expires: Date.now() + 7 * 86400000 });
    return result;
  } catch {
    if (old && old.expires > Date.now()) return old.options;
    throw new Error('Locations unavailable');
  }
}
