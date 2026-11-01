param()
$ErrorActionPreference='Stop'
$env:NEXT_PUBLIC_SUPABASE_URL=''
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY=''
$env:SUPABASE_SERVICE_ROLE_KEY=''
$env:GOOGLE_INDEXING_SA_JSON=''
$env:INDEXNOW_KEY=''
$env:PLAYWRIGHT_TEST='false'
$env:NEXT_PUBLIC_APPLY_DELAY_SECONDS='10'
$folder=Join-Path $PSScriptRoot '../verification/v0.1.3/environment-smoke'
New-Item -ItemType Directory -Force $folder | Out-Null
$env:SITE_ENV='production'; $env:DEMO_MODE='false'; $env:NEXT_PUBLIC_SITE_URL=''
& npm.cmd run build *> (Join-Path $folder 'missing-url-build.txt')
if ($LASTEXITCODE -eq 0) { throw 'Production build unexpectedly accepted missing URL.' }
Write-Output 'PASS production build rejects missing URL'
foreach ($environment in @('staging','production')) {
  $env:SITE_ENV=$environment
  $env:NEXT_PUBLIC_SITE_URL=$(if ($environment -eq 'staging') {'https://staging.example.com'} else {'https://www.example.com'})
  $env:DEMO_MODE=$(if ($environment -eq 'staging') {'true'} else {'false'})
  & npm.cmd run build *> (Join-Path $folder ($environment+'-build.txt'))
  if ($LASTEXITCODE -ne 0) { throw "$environment build failed." }
  $server=Start-Process -FilePath (Get-Command node.exe).Source -ArgumentList @('node_modules/next/dist/bin/next','start','--port','3212') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $folder ($environment+'-server.txt')) -RedirectStandardError (Join-Path $folder ($environment+'-server-errors.txt'))
  try {
    $ready=$false
    for ($i=0;$i -lt 30;$i++) {
      try { $homeResponse=Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:3212/' -TimeoutSec 2; $ready=$true; break } catch { Start-Sleep -Milliseconds 500 }
    }
    if (-not $ready) { throw "$environment fixture not ready." }
    $robots=Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:3212/robots.txt'
    if (-not $homeResponse.Content.Contains($env:NEXT_PUBLIC_SITE_URL)) { throw 'Configured canonical/JSON-LD origin missing.' }
    if ($environment -eq 'staging') {
      if ($homeResponse.Headers['X-Robots-Tag'] -notmatch 'noindex' -or $homeResponse.Content -notmatch 'name="robots" content="noindex, nofollow"' -or $robots.Content -notmatch 'Disallow: /\s*$') { throw 'Staging indexing protection missing.' }
    } else {
      if ($homeResponse.Headers['X-Robots-Tag'] -match 'noindex' -or $homeResponse.Content -notmatch 'name="robots" content="index, follow"' -or $robots.Content -notmatch 'Allow: /') { throw 'Production discovery contract failed.' }
      if ($homeResponse.Content.Contains('SAMPLE DATA')) { throw 'Production rendered demo jobs.' }
    }
    Write-Output "PASS $environment actual build, headers, robots, metadata and canonical origin"
  } finally { Stop-Process -Id $server.Id -ErrorAction SilentlyContinue }
}
