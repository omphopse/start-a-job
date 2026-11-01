import { z } from 'zod';

const name = z.string().trim().min(1).max(100);
const namedItems = z.array(z.object({ name }));

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
  try {
    const response = await fetch(`https://countriesnow.space/api/v0.1/countries/${path}?${query}`, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error('Location provider unavailable');
    const payload = await response.json();
    if (payload.error) throw new Error('Location provider rejected selection');
    const options =
      kind === 'cities'
        ? z.array(name).parse(payload.data)
        : namedItems
            .parse(kind === 'states' ? payload.data.states : payload.data)
            .map((item) => item.name);
    return Response.json({ options: [...new Set(options)].sort((a, b) => a.localeCompare(b)) });
  } catch {
    return Response.json(
      { error: 'Locations could not be loaded. Please retry.' },
      { status: 502 },
    );
  }
}
