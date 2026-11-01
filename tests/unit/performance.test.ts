import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPerformanceTrace } from '../../lib/performance';

test('performance tracing is opt-in and never logs request secrets', async () => {
  const previous = process.env.PERF_REQUESTS;
  const originalInfo = console.info;
  const originalFetch = globalThis.fetch;
  const lines: string[] = [];
  console.info = (line: string) => lines.push(line);
  globalThis.fetch = async () => new Response('private response', { status: 200 });
  try {
    delete process.env.PERF_REQUESTS;
    const disabled = createPerformanceTrace('test');
    assert.equal(await disabled.measure('value', () => 7), 7);
    disabled.finish();
    assert.deepEqual(lines, []);
    process.env.PERF_REQUESTS = '1';
    const timing = createPerformanceTrace('test');
    await timing.measure('query.editJob', () =>
      timing.fetch('https://example.com/rest/v1/jobs?id=eq.private-id', {
        headers: { Authorization: 'Bearer private-token' },
      }),
    );
    await assert.rejects(
      timing.measure('failure', () => {
        throw new Error('private-error');
      }),
    );
    timing.finish();
    const entries = lines.map((line) => JSON.parse(line));
    assert.deepEqual(
      entries.map((entry) => entry.operation),
      ['http.jobs', 'query.editJob', 'failure', 'total'],
    );
    assert.equal(new Set(entries.map((entry) => entry.trace)).size, 1);
    assert.ok(entries.every((entry) => entry.duration_ms >= 0));
    assert.equal(entries[0].status, 200);
    assert.doesNotMatch(lines.join(''), /private-|Authorization|example.com/);
  } finally {
    console.info = originalInfo;
    globalThis.fetch = originalFetch;
    if (previous === undefined) delete process.env.PERF_REQUESTS;
    else process.env.PERF_REQUESTS = previous;
  }
});
