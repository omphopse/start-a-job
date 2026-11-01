import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GET } from '../../app/api/locations/route';
import { jobFormInput } from '../../lib/validation';
import { sampleJobs } from '../../lib/sample-jobs';

test('job form accepts a country with blank city and state', () => {
  const input = {
    ...sampleJobs[0],
    location: '',
    state: '',
    country: 'Canada',
    application: 'jobs@example.com',
    original_summary: 'on',
    official_confirmed: 'on',
    no_fees: 'on',
  };
  const parsed = jobFormInput.parse(input);
  assert.equal(parsed.country, 'Canada');
  assert.equal(parsed.location, '');
  assert.equal(parsed.state, '');
  assert.equal(jobFormInput.safeParse({ ...input, country: '' }).success, false);
  assert.equal(jobFormInput.parse({ ...input, country: undefined }).country, 'India');
});

test('location API validates requests, normalizes provider options and handles failures', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () =>
    Response.json({
      error: false,
      data: { states: [{ name: 'Maharashtra' }, { name: 'Karnataka' }, { name: 'Maharashtra' }] },
    }),
  );
  const result = await GET(new Request('http://localhost/api/locations?kind=states&country=India'));
  assert.deepEqual(await result.json(), { options: ['Karnataka', 'Maharashtra'] });
  assert.match(String(fetchMock.mock.calls[0].arguments[0]), /states\/q\?country=India/);
  assert.equal((await GET(new Request('http://localhost/api/locations?kind=cities'))).status, 400);
  assert.equal((await GET(new Request('http://localhost/api/locations?kind=invalid'))).status, 400);
  fetchMock.mock.mockImplementation(async () =>
    Response.json({ error: false, data: ['Pune', 'Mumbai'] }),
  );
  assert.deepEqual(
    await (
      await GET(
        new Request('http://localhost/api/locations?kind=cities&country=India&state=Maharashtra'),
      )
    ).json(),
    { options: ['Mumbai', 'Pune'] },
  );
  assert.match(String(fetchMock.mock.calls.at(-1)!.arguments[0]), /state\/cities\/q/);
  fetchMock.mock.mockImplementation(async () => {
    throw new Error('Offline');
  });
  assert.equal((await GET(new Request('http://localhost/api/locations'))).status, 502);
});
