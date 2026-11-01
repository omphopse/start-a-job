import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { brandDefaults, site } from '../../lib/config';
import { otpEmailTemplate } from '../../lib/email-template';

test('current source and setup docs have no hard-coded display brand outside its config', () => {
  const files: string[] = [];
  function walk(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.(ts|tsx|mjs)$/.test(path)) files.push(path);
    }
  }
  for (const directory of ['app', 'components', 'lib', 'scripts', 'tests']) walk(directory);
  files.push(
    'README.md',
    'SETUP.md',
    'playwright.config.ts',
    '.env.example',
    '.env.staging.example',
    '.env.production.example',
  );
  for (const file of files.filter((file) => file.replaceAll('\\', '/') !== 'lib/config.ts')) {
    assert.equal(
      readFileSync(file, 'utf8').toLowerCase().includes(brandDefaults.name.toLowerCase()),
      false,
      `${file} duplicates the brand default`,
    );
  }
});
test('email template and public domain read the central brand config', () => {
  assert.ok(otpEmailTemplate().includes(site.name));
  assert.ok(otpEmailTemplate().includes('{{ .Token }}'));
  assert.equal(site.domain, new URL(site.url).hostname);
});
