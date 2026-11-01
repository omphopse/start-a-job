param(
  [string]$ClonePath = 'C:\Users\Asus\AppData\Local\Temp\deskjobs-audit-final-20261101'
)
$sourcePath = 'C:\Users\Asus\Documents\DeskJobs'
$evidencePath = Join-Path $sourcePath 'verification\audit'
if (Test-Path -LiteralPath $ClonePath) { throw 'Final clone path already exists; refusing to overwrite it.' }
git clone --no-hardlinks $sourcePath $ClonePath
if ($LASTEXITCODE -ne 0) { throw 'Clone failed.' }
Set-Location -LiteralPath $ClonePath
$initialStatus = git status --short
$revision = git rev-parse HEAD
Copy-Item -LiteralPath '.env.example' -Destination '.env.local'
foreach ($line in Get-Content -LiteralPath '.env.example') {
  if ($line -match '^([A-Z0-9_]+)=(.*)$') {
    [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], 'Process')
  }
}
$env:NEXT_PUBLIC_SITE_URL = 'http://localhost:3400'
$env:SEO_BASE_URL = 'http://localhost:3400'
$results = @()
function Invoke-AuditGate {
  param([string]$Name, [string[]]$Arguments)
  $watch = [Diagnostics.Stopwatch]::StartNew()
  & npm.cmd @Arguments 2>&1 | Tee-Object -FilePath (Join-Path $evidencePath "final-clean-$Name.txt")
  $code = $LASTEXITCODE
  $watch.Stop()
  $script:results += [PSCustomObject]@{ name=$Name; command=('npm '+($Arguments -join ' ')); exit=$code; seconds=[math]::Round($watch.Elapsed.TotalSeconds,2) }
  [PSCustomObject]@{ revision=$revision; initialStatus=@($initialStatus); results=$script:results } | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $evidencePath 'final-clean-summary.json')
  Write-Output "AUDIT GATE $Name exit=$code elapsed=$($watch.Elapsed.TotalSeconds)s"
  if ($code -ne 0) { throw "Gate $Name failed. Later gates were not run." }
}
Invoke-AuditGate -Name 'install' -Arguments @('ci','--offline','--no-audit')
Invoke-AuditGate -Name 'lint' -Arguments @('run','lint')
Invoke-AuditGate -Name 'types' -Arguments @('run','typecheck')
Invoke-AuditGate -Name 'unit' -Arguments @('run','test:unit')
Invoke-AuditGate -Name 'build' -Arguments @('run','build')
Invoke-AuditGate -Name 'playwright' -Arguments @('run','test:ui','--','--workers=2')
$sourceStatus = @(git status --short -- app components lib scripts tests supabase next.config.ts package.json package-lock.json)
[IO.File]::WriteAllText((Join-Path $evidencePath 'final-clean-source-status.txt'), ($sourceStatus -join "`r`n"))
