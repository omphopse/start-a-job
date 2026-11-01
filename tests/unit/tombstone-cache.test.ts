import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTombstoneCache } from '../../lib/tombstone-cache';

test('public tombstone cache coalesces concurrent reads, expires and evicts', async () => {
  let time = 0,
    calls = 0,
    removed = false;
  const cache = createTombstoneCache(
    async () => {
      calls++;
      return removed;
    },
    10,
    2,
    () => time,
  );
  assert.deepEqual(await Promise.all([cache.read('a'), cache.read('a')]), [false, false]);
  assert.equal(calls, 1);
  removed = true;
  assert.equal(await cache.read('a'), false);
  time = 10;
  assert.equal(await cache.read('a'), true);
  assert.equal(calls, 2);
  await cache.read('b');
  await cache.read('c');
  await cache.read('a');
  assert.equal(calls, 5, 'capacity evicts the oldest key');
  cache.clear('a');
  await cache.read('a');
  assert.equal(calls, 6);
  cache.clear();
  await cache.read('a');
  assert.equal(calls, 7);
});
test('failed tombstone reads are retried rather than cached as public access', async () => {
  let calls = 0;
  const cache = createTombstoneCache(async () => {
    if (++calls === 1) throw new Error('unavailable');
    return true;
  });
  await assert.rejects(cache.read('a'), /unavailable/);
  assert.equal(await cache.read('a'), true);
  assert.equal(calls, 2);
});
