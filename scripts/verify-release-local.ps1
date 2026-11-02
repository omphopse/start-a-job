param([Parameter(Mandatory=$true)][string]$Item)
$ErrorActionPreference = 'Stop'
# Node preserves empty environment variables, preventing dotenv from loading live credentials.
& node (Join-Path $PSScriptRoot 'verify-filters-local.mjs') $Item
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
