import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertDeploymentEnvironment,
  environmentHeaders,
  robotsPolicy,
  siteEnvironment,
} from '../../lib/environment';
import { robotsText } from '../../lib/robots';
import { metadata } from '../../lib/seo/metadata';
import { homeSchema } from '../../lib/seo/schema';
import { site } from '../../lib/config';

test('staging is noindex in headers, metadata and robots while production permits discovery', () => {
  assert.deepEqual(environmentHeaders('staging'), [
    { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
  ]);
  assert.equal(robotsPolicy(false, 'staging').index, false);
  assert.equal(
    robotsText('https://staging.example.com', 'staging'),
    'User-agent: *\nDisallow: /\n',
  );
  assert.deepEqual(environmentHeaders('production'), []);
  assert.equal(robotsPolicy(false, 'production').index, true);
  assert.equal(robotsPolicy(true, 'production').index, false);
  assert.ok(robotsText('https://www.example.com', 'production').includes('Allow: /'));
  assert.equal(siteEnvironment({ NODE_ENV: 'production' }), 'production');
});
test('production configuration rejects missing/local origins, demo mode and non-ten-second delays', () => {
  const valid = {
    SITE_ENV: 'production',
    NEXT_PUBLIC_SITE_URL: 'https://www.example.com',
    DEMO_MODE: 'false',
    NEXT_PUBLIC_APPLY_DELAY_SECONDS: '10',
  };
  assert.doesNotThrow(() => assertDeploymentEnvironment(valid));
  for (const url of [
    '',
    'http://localhost:3000',
    'https://localhost',
    'https://a.localhost',
    'https://127.0.0.1',
    'https://[::1]',
    'https://www.example.com/path',
  ])
    assert.throws(() => assertDeploymentEnvironment({ ...valid, NEXT_PUBLIC_SITE_URL: url }));
  assert.throws(() => assertDeploymentEnvironment({ ...valid, DEMO_MODE: 'true' }));
  assert.throws(() =>
    assertDeploymentEnvironment({ ...valid, NEXT_PUBLIC_APPLY_DELAY_SECONDS: '2' }),
  );
});
test('canonical, OpenGraph and organization URLs use the configured site origin', () => {
  const value = metadata('Example', 'Example description', '/jobs');
  assert.equal(value.alternates?.canonical, `${site.url}/jobs`);
  assert.equal(value.openGraph?.url, `${site.url}/jobs`);
  assert.equal(homeSchema()[0].url, site.url);
});
