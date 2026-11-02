import { providerLocations } from '@/lib/location-provider';
import { locationName } from '@/lib/location-names';
import { z } from 'zod';

const name = locationName.refine((value) => value.length > 0);

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const parsed = z
    .object({ country: name.optional(), state: name.optional() })
    .safeParse(Object.fromEntries(params));
  if (!parsed.success || (parsed.data.state && !parsed.data.country))
    return Response.json({ error: 'Invalid location selection.' }, { status: 400 });
  const { country, state } = parsed.data;
  const kind = params.get('kind') || 'countries';
  if (!['countries', 'states', 'cities'].includes(kind) || (kind !== 'countries' && !country))
    return Response.json({ error: 'Select a country first.' }, { status: 400 });
  try {
    const options = await providerLocations(kind, country, state);
    return Response.json({ options });
  } catch {
    return Response.json(
      { error: 'Locations could not be loaded. Please retry.' },
      { status: 502 },
    );
  }
}
