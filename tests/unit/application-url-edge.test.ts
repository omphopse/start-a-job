import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applicationUrl } from '../../lib/application-method';

test('malformed and malicious application URLs return validation errors without throwing', () => {
  const rejected = [
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'http://company.com/jobs',
    '//company.com/jobs',
    'ftp://company.com/jobs',
    'https://user:pass@company.com/jobs',
    'https://user@company.com/jobs',
    'https://company.com:8443/jobs',
    'https://127.0.0.1/jobs',
    'https://2130706433/jobs',
    'https://0x7f000001/jobs',
    'https://[::1]/jobs',
    'https://localhost/jobs',
    'https://server.local/jobs',
    'https://bit.ly/jobs',
    'https://sub.bit.ly/jobs',
    'https://tinyurl.com/jobs',
    'https://wa.me/123',
    'https://t.me/job',
    'https://telegram.me/jobs',
    'https://whatsapp.com/jobs',
    'https:\\company.com/jobs',
    'https://company.com/a b',
    'https://company.com/\nfoo',
    'https://company.com/\u0000foo',
  ];
  for (const value of rejected) {
    assert.doesNotThrow(() => {
      assert.equal(applicationUrl.safeParse(value).success, false, JSON.stringify(value));
    });
  }
  for (const value of [
    'https://company.com/jobs',
    ' HTTPS://company.com/jobs ',
    'https://company.com/jobs?q=engineer&level=1',
  ])
    assert.ok(applicationUrl.safeParse(value).success);
});
