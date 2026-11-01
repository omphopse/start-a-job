param([Parameter(Mandatory=$true)][string]$Item)
$ErrorActionPreference='Stop'
# Local-only fixture. Explicitly override private .env.local deployment values.
$env:NEXT_PUBLIC_SUPABASE_URL=''
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY=''
$env:SUPABASE_SERVICE_ROLE_KEY=''
$env:GOOGLE_INDEXING_SA_JSON=''
$env:INDEXNOW_KEY=''
$env:SITE_ENV='local'
$env:NEXT_PUBLIC_SITE_URL='http://localhost:3210'
$env:DEMO_MODE='true'
$env:NEXT_PUBLIC_APPLY_DELAY_SECONDS='2'
$env:PLAYWRIGHT_TEST='false'
$folder=Join-Path $PSScriptRoot ('../verification/v0.1.3/'+$Item)
New-Item -ItemType Directory -Force $folder | Out-Null
foreach ($task in @('lint','typecheck','test:unit','build')) {
  $args=@('run',$task)
  & npm.cmd @args *> (Join-Path $folder ($task.Replace(':','-')+'.txt'))
  if ($LASTEXITCODE -ne 0) { throw "$task failed; see verification/v0.1.3/$Item" }
  Write-Output "PASS $task"
}
$server = Start-Process -FilePath (Get-Command node.exe).Source -ArgumentList @('node_modules/next/dist/bin/next','start','--port','3210') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $folder 'server.txt') -RedirectStandardError (Join-Path $folder 'server-errors.txt')
try {
  $ready=$false
  for ($i=0; $i -lt 30; $i++) {
    try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:3210/api/public/jobs.json?limit=1' -TimeoutSec 2; if ($r.StatusCode -eq 200) { $ready=$true; break } } catch { }
    Start-Sleep -Milliseconds 500
  }
  if (-not $ready) { throw 'Local fixture failed to start.' }
  $env:TEST_BASE_URL='http://localhost:3210'
  $env:SEO_BASE_URL='http://localhost:3210'
  foreach ($task in @('test:ui','seo:check')) {
    & npm.cmd run $task *> (Join-Path $folder ($task.Replace(':','-')+'.txt'))
    if ($LASTEXITCODE -ne 0) { throw "$task failed; see verification/v0.1.3/$Item" }
    Write-Output "PASS $task"
  }
} finally { Stop-Process -Id $server.Id -ErrorAction SilentlyContinue }
