param()
$ErrorActionPreference = 'Stop'
# Use environment variables; never echo credentials or response bodies.
$url = $env:NEXT_PUBLIC_SUPABASE_URL
$key = $env:NEXT_PUBLIC_SUPABASE_ANON_KEY
if (-not $url -or -not $key) { throw 'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in this process.' }
$source = Get-Content -Raw (Join-Path $PSScriptRoot '../lib/public-job-fields.ts')
$block = [regex]::Match($source, 'PUBLIC_JOB_COLUMN_NAMES = \[([\s\S]*?)\] as const').Groups[1].Value
$publicColumns = @([regex]::Matches($block, "'([a-z_]+)'") | ForEach-Object { $_.Groups[1].Value })
if ($publicColumns.Count -eq 0) { throw 'Cannot read public column allow-list.' }
$internalColumns = @('created_by', 'approved_by', 'rejection_reason', 'search_document', 'created_at', 'updated_at', 'status', '*')
$failed = $false
foreach ($col in ($internalColumns + $publicColumns)) {
  try {
    $response = Invoke-WebRequest -Uri ($url.TrimEnd('/') + '/rest/v1/jobs?select=' + $col + '&limit=1') -Headers @{ apikey = $key; Authorization = "Bearer $key" } -SkipHttpErrorCheck -TimeoutSec 20
    $readable = $response.StatusCode -eq 200
    $denied = $response.StatusCode -in @(401,403) -and $response.Content -match '42501'
    if ($col -in $internalColumns) {
      if ($denied) { Write-Output "denied : $col" }
      else { Write-Output "EXPOSED: $col"; $failed = $true }
    } else {
      if ($readable) { Write-Output "OK : $col" }
      else { Write-Output "BROKEN: $col"; $failed = $true }
    }
  } catch {
    Write-Output "ERROR: $col (request failed)"
    $failed = $true
  }
}
if ($failed) { Write-Output 'FAIL'; exit 1 }
Write-Output 'PASS'
