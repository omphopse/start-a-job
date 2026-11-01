import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('common private-key containers and service accounts are ignored while the env template is trackable', () => {
  const paths = [
    'audit-private.key',
    'audit-private.p12',
    'audit-private.pfx',
    'audit-service_account.json',
    '.env.audit',
  ];
  const result = spawnSync('git', ['check-ignore', '--no-index', '--stdin'], {
    input: paths.join('\n') + '\n',
    encoding: 'utf8',
  });
  assert.equal(result.status, 0);
  assert.deepEqual(new Set(result.stdout.trim().split(/\r?\n/)), new Set(paths));
  const template = spawnSync('git', ['check-ignore', '--no-index', '.env.example'], {
    encoding: 'utf8',
  });
  assert.equal(template.status, 1);
});
