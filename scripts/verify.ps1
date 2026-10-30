$ErrorActionPreference = 'Stop'
foreach ($task in @('lint','typecheck','test:unit','test:ui','build')) {
  npm run $task
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
