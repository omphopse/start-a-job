import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test(
  'anonymous probe classifies responses in Windows PowerShell 5.1',
  { skip: process.platform !== 'win32' },
  () => {
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
  },
);

test(
  'PowerShell request adapter accepts empty 200 responses and preserves safe network error codes',
  { skip: process.platform !== 'win32' },
  () => {
    const script = `. ./scripts/verify-live-anon.ps1 -LibraryOnly
$script:url='https://fixture.invalid'; $script:key='never-print-this-fixture-key'
function Invoke-WebRequest { param($Uri,$Headers,$UseBasicParsing,$TimeoutSec,$Method,$ContentType,$Body) return [pscustomobject]@{StatusCode=200;Content='[]'} }
$r = Invoke-AnonProbe 'jobs?select=id&limit=1'
if ($r.Kind -ne 'OK' -or $r.Status -ne 200) { exit 1 }
function Invoke-WebRequest { param($Uri,$Headers,$UseBasicParsing,$TimeoutSec,$Method,$ContentType,$Body) throw (New-Object System.Net.WebException('never-print-this-fixture-key', [System.Net.WebExceptionStatus]::ConnectFailure)) }
$r = Invoke-AnonProbe 'jobs?select=id&limit=1'
if ($r.Kind -ne 'CONFIG/NETWORK ERROR' -or $r.Status -ne 0 -or -not $r.Code) { exit 2 }
`;
    const result = spawnSync(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { encoding: 'utf8' },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal((result.stdout + result.stderr).includes('never-print-this-fixture-key'), false);
  },
);

test(
  'facet probe projection guard rejects private fields and rows beyond the cap',
  { skip: process.platform !== 'win32' },
  () => {
    const script = `. ./scripts/verify-live-anon.ps1 -LibraryOnly
$columns=@('country','state','city','job_count')
$valid=[pscustomobject]@{country='India';state='Maharashtra';city='Pune';job_count=2}
if (-not (Test-ProbeRows @($valid) $columns 1)) { exit 1 }
if (Test-ProbeRows @($valid,$valid) $columns 1) { exit 2 }
if (Test-ProbeRows @([pscustomobject]@{created_by='private'}) $columns 1) { exit 3 }
if (-not (Test-ProbeRows @() $columns 500)) { exit 4 }
if (Test-ProbeRows @([pscustomobject]@{country='India'}) $columns 1) { exit 5 }
`;
    const result = spawnSync(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { encoding: 'utf8' },
    );
    assert.equal(result.status, 0, result.stderr);
  },
);
