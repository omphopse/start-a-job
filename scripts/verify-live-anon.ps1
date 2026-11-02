param([switch]$LibraryOnly)
$ErrorActionPreference = 'Stop'

function Get-ProbeClassification($Status, $Code) {
  if ($Status -eq 200) { return 'OK' }
  if ($Status -in @(401,403) -or $Code -eq '42501') { return 'denied' }
  return 'CONFIG/NETWORK ERROR'
}
function Invoke-AnonProbe($Path, $Body = $null) {
  $status = 0; $content = ''; $code = ''
  try {
    $args = @{ Uri = ($script:url.TrimEnd('/') + '/rest/v1/' + $Path); Headers = @{ apikey = $script:key; Authorization = "Bearer $script:key" }; UseBasicParsing = $true; TimeoutSec = 20 }
    if ($null -ne $Body) { $args.Method = 'POST'; $args.ContentType = 'application/json'; $args.Body = ($Body | ConvertTo-Json -Compress) }
    $response = Invoke-WebRequest @args
    $status = [int]$response.StatusCode; $content = $response.Content
  } catch {
    if ($_.Exception.Status) { $code = [string]$_.Exception.Status } else { $code = $_.Exception.GetType().Name }
    if ($_.Exception.Response) {
      $status = [int]$_.Exception.Response.StatusCode
      $content = $_.ErrorDetails.Message
      if (-not $content) {
        try { $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream()); $content = $reader.ReadToEnd(); $reader.Dispose() } catch { }
      }
    }
  }
  $data = $null
  if ($content) { try { $data = ConvertFrom-Json $content; $code = [string]$data.code } catch { $code = 'INVALID_JSON' } }
  # Never return raw server messages: they can contain credentials or private data.
  if ($code -notmatch '^[A-Za-z0-9_]{0,32}$') { $code = 'UNRECOGNIZED' }
  return @{ Status = $status; Code = $code; Kind = (Get-ProbeClassification $status $code); Data = $data }
}
function Test-ProbeRows($Data, [string[]]$Columns, [int]$Cap) {
  $rows = @($Data | Where-Object { $null -ne $_ })
  if ($rows.Count -gt $Cap) { return $false }
  foreach ($row in $rows) {
    if (@($row.PSObject.Properties.Name).Count -ne $Columns.Count) { return $false }
    foreach ($property in $row.PSObject.Properties.Name) {
      if ($property -notin $Columns) { return $false }
    }
  }
  return $true
}
if ($LibraryOnly) { return }
$script:url = $env:NEXT_PUBLIC_SUPABASE_URL
$script:key = $env:NEXT_PUBLIC_SUPABASE_ANON_KEY
if (-not $url -or -not $key) { throw 'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in this process.' }
$target = [uri]$url
if ($target.Scheme -notin @('https','http') -or $target.UserInfo) { throw 'Invalid Supabase URL.' }
Write-Output ('Target project ref: ' + $target.DnsSafeHost.Split('.')[0])
$source = Get-Content -Raw (Join-Path $PSScriptRoot '../lib/public-job-fields.ts')
$block = [regex]::Match($source, 'PUBLIC_JOB_COLUMN_NAMES = \[([\s\S]*?)\] as const').Groups[1].Value
$publicColumns = @([regex]::Matches($block, "'([a-z_]+)'") | ForEach-Object { $_.Groups[1].Value })
if (-not $publicColumns.Count) { throw 'Cannot read public column allow-list.' }
$internalColumns = @('created_by','approved_by','rejection_reason','search_document','status','created_at','updated_at','*')
$results = New-Object System.Collections.Generic.List[object]
$stop = $false
foreach ($col in ($internalColumns + $publicColumns)) {
  $r = Invoke-AnonProbe ('jobs?select=' + $col + '&limit=1')
  $ok = ($col -in $internalColumns -and $r.Kind -eq 'denied') -or ($col -in $publicColumns -and $r.Kind -eq 'OK')
  $note = $r.Kind
  if ($col -eq 'application_email' -and $ok) { $note = 'public by design' }
  $results.Add([pscustomobject]@{ Probe = $col; Result = $(if ($ok) {'PASS'} else {'FAIL'}); Detail = "$note (HTTP $($r.Status), code=$($r.Code))" })
  if ($r.Kind -eq 'CONFIG/NETWORK ERROR') { $stop = $true; break }
}
# List and similar jobs use search_public_jobs with PostgREST filters, not separate RPCs.
$probes = @(
  @{ Name='list'; Rpc='search_public_jobs'; Body=@{p_query=$null}; Query='limit=20' },
  @{ Name='search'; Rpc='search_public_jobs'; Body=@{p_query='assistant'}; Query='limit=20' },
  @{ Name='similar'; Rpc='search_public_jobs'; Body=@{p_query=$null}; Query='category=eq.Office&limit=4' },
  @{ Name='detail'; Rpc='get_public_job'; Body=@{p_slug='verification-missing-slug'}; Query='limit=1' },
  @{ Name='expired detail'; Rpc='get_expired_job'; Body=@{p_slug='verification-missing-slug'}; Query='limit=1' }
)
if (-not $stop) {
  foreach ($probe in $probes) {
    foreach ($mode in @('normal','long','special','large limit','negative offset')) {
      $body = $probe.Body.Clone(); $query = $probe.Query
      if ($mode -in @('long','special')) {
        $value = $(if ($mode -eq 'long') { 'x' * 10000 } else { "'&%_():*!<script>" })
        if ($body.ContainsKey('p_query')) { $body.p_query = $value } else { $body.p_slug = $value }
      }
      if ($mode -eq 'large limit') { $query = 'limit=1000000' }
      if ($mode -eq 'negative offset') { $query = 'limit=1&offset=-1' }
      $r = Invoke-AnonProbe ('rpc/' + $probe.Rpc + '?' + $query) $body
      $expectedRejection = $mode -eq 'negative offset' -and $r.Status -in @(400,416) -and $r.Code -match '^PGRST(100|103)$'
      $safe = $true
      if ($r.Status -eq 200) {
        foreach ($row in @($r.Data)) {
          if ($null -eq $row) { continue }
          foreach ($property in $row.PSObject.Properties.Name) { if ($property -notin $publicColumns) { $safe = $false } }
        }
      }
      $ok = ($r.Status -eq 200 -and $safe -and @($r.Data).Count -le 1000) -or $expectedRejection
      $results.Add([pscustomobject]@{ Probe = "$($probe.Name)/$mode"; Result = $(if ($ok) {'PASS'} else {'FAIL'}); Detail = "HTTP $($r.Status), code=$($r.Code); public projection=$safe" })
      if ($r.Kind -eq 'CONFIG/NETWORK ERROR' -and -not $expectedRejection) { $stop = $true; break }
    }
    if ($stop) { break }
  }
}
# New RPC signatures are validated without printing response bodies or input values.
if (-not $stop) {
  $facetColumns = @('country','state','city','job_count')
  $facetCases = @(
    @{ Name='normal'; Limit=500; Cap=500 },
    @{ Name='null'; Limit=$null; Cap=500 },
    @{ Name='negative'; Limit=-99; Cap=1 },
    @{ Name='large'; Limit=2147483647; Cap=500 },
    @{ Name='invalid type'; Limit="1; select created_by from jobs"; Cap=0 }
  )
  foreach ($case in $facetCases) {
    $r = Invoke-AnonProbe 'rpc/public_job_location_facets' @{p_limit=$case.Limit}
    $rejected = $case.Name -eq 'invalid type' -and $r.Status -eq 400 -and $r.Code -eq '22P02'
    $safe = $r.Status -eq 200 -and (Test-ProbeRows $r.Data $facetColumns $case.Cap)
    $ok = $safe -or $rejected
    $results.Add([pscustomobject]@{ Probe="facets/$($case.Name)"; Result=$(if($ok){'PASS'}else{'FAIL'}); Detail="HTTP $($r.Status), code=$($r.Code); bounded projection=$safe" })
    if (-not $ok) { $stop=$true; break }
  }
}
if (-not $stop) {
  foreach ($parameter in @('p_country','p_state','p_city')) {
    foreach ($mode in @('normal','unknown','long','special')) {
      $body = @{p_query=$null; p_country=$null; p_state=$null; p_city=$null}
      $body[$parameter] = switch ($mode) {
        'normal' { if($parameter -eq 'p_country'){'India'} elseif($parameter -eq 'p_state'){'Maharashtra'} else {'Pune'} }
        'unknown' { 'Verification Nonexistent Location' }
        'long' { 'x' * 10000 }
        'special' { "'; drop table jobs;--" }
      }
      $r = Invoke-AnonProbe 'rpc/search_public_jobs?limit=20' $body
      $safe = $r.Status -eq 200 -and (Test-ProbeRows $r.Data $publicColumns 20)
      if ($mode -ne 'normal' -and @($r.Data | Where-Object { $null -ne $_ }).Count -gt 0) { $safe=$false }
      $results.Add([pscustomobject]@{ Probe="location/$parameter/$mode"; Result=$(if($safe){'PASS'}else{'FAIL'}); Detail="HTTP $($r.Status), code=$($r.Code); public projection=$safe" })
      if (-not $safe) { $stop=$true; break }
    }
    if ($stop) { break }
  }
}
if (-not $stop) {
  foreach ($parameter in @('p_qualification','p_experience_level')) {
    $body = @{p_query=$null}; $body[$parameter]='retired'
    $r = Invoke-AnonProbe 'rpc/search_public_jobs?limit=1' $body
    $ok = $r.Status -eq 404 -and $r.Code -eq 'PGRST202'
    $results.Add([pscustomobject]@{ Probe="retired/$parameter"; Result=$(if($ok){'PASS'}else{'FAIL'}); Detail="HTTP $($r.Status), code=$($r.Code); unsupported RPC argument rejected" })
    if (-not $ok) { $stop=$true; break }
  }
}
$results | Format-Table -AutoSize | Out-String -Width 180 | Write-Output
if ($stop -or @($results | Where-Object Result -eq 'FAIL').Count) { Write-Output 'FAIL'; exit 1 }
Write-Output 'PASS'
