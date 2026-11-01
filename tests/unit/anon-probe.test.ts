import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('anonymous probe classifies responses in Windows PowerShell 5.1', () => {
  const script = `. ./scripts/verify-live-anon.ps1 -LibraryOnly
$cases = @(@(200,'','OK'),@(401,'','denied'),@(403,'','denied'),@(400,'42501','denied'),@(404,'PGRST202','CONFIG/NETWORK ERROR'),@(503,'PGRST002','CONFIG/NETWORK ERROR'),@(0,'','CONFIG/NETWORK ERROR'))
foreach ($c in $cases) { if ((Get-ProbeClassification $c[0] $c[1]) -ne $c[2]) { exit 1 } }
`;
  const result = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
    { encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr);
});
