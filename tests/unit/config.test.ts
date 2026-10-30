import { test } from 'node:test';
import assert from 'node:assert/strict';
import { site } from '../../lib/config';
test('site URL is absolute', () => assert.ok(new URL(site.url).host));
