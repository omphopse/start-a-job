import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  jobDefaultValidDays,
  defaultClosingDate,
  resolveClosingDate,
} from '../../lib/closing-date';
import { isExpired } from '../../lib/jobs';
test('closing defaults use calendar arithmetic, preserve chosen dates, and can be disabled', () => {
  assert.equal(jobDefaultValidDays(''), 30);
  assert.equal(defaultClosingDate(30, '2026-12-15'), '2027-01-14');
  assert.equal(defaultClosingDate(1, '2028-02-28'), '2028-02-29');
  assert.equal(resolveClosingDate(null, 30, '2026-11-01'), '2026-12-01');
  assert.equal(resolveClosingDate('2026-10-01', 30, '2026-11-01'), '2026-10-01');
  assert.equal(resolveClosingDate(null, 0), null);
  for (const value of ['-1', '1.5', 'NaN', '3651']) assert.throws(() => jobDefaultValidDays(value));
  assert.equal(isExpired({ last_date: '2026-11-01' }, '2026-11-01'), false);
  assert.equal(isExpired({ last_date: '2026-10-31' }, '2026-11-01'), true);
});
