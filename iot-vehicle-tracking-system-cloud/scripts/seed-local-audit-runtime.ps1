Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Read-DotEnv([string]$Path) {
  $map = @{}
  foreach ($line in Get-Content -Path $Path) {
    if ([string]::IsNullOrWhiteSpace($line) -or $line.TrimStart().StartsWith('#')) {
      continue
    }
    $parts = $line -split '=', 2
    if ($parts.Count -eq 2) {
      $map[$parts[0].Trim()] = $parts[1].Trim()
    }
  }
  return $map
}

function Get-AuthToken {
  $login = Invoke-RestMethod -Method Post -Uri 'http://localhost:4000/api/v1/auth/login' -ContentType 'application/json' -Body '{"username":"admin","password":"Admin@2026"}'
  return $login.data.token
}

function Get-TripMap([string]$Token) {
  $headers = @{ Authorization = "Bearer $Token" }
  $resp = Invoke-RestMethod -Method Get -Uri 'http://localhost:4000/api/v1/trips?limit=50' -Headers $headers
  $map = @{}
  foreach ($trip in $resp.data.items) {
    $map[$trip.tripCode] = $trip
  }
  return $map
}

function To-UnixMilliseconds([datetime]$Value) {
  $dto = [System.DateTimeOffset]::new($Value)
  return $dto.ToUnixTimeMilliseconds()
}

function New-InterpolatedPoints {
  param(
    [string]$DeviceId,
    [datetime]$Start,
    [datetime]$End,
    [double]$StartLat,
    [double]$StartLon,
    [double]$EndLat,
    [double]$EndLon,
    [double[]]$Speeds,
    [double[]]$Courses
  )

  if ($Speeds.Count -ne $Courses.Count) {
    throw 'Speeds and courses must have the same length.'
  }

  $total = $Speeds.Count
  if ($total -lt 2) {
    throw 'At least two points are required.'
  }

  $durationMs = ($End.ToUniversalTime() - $Start.ToUniversalTime()).TotalMilliseconds
  $lines = New-Object System.Collections.Generic.List[string]

  for ($index = 0; $index -lt $total; $index++) {
    $ratio = if ($total -eq 1) { 0 } else { $index / ($total - 1) }
    $timestamp = To-UnixMilliseconds($Start.ToUniversalTime().AddMilliseconds($durationMs * $ratio))
    $lat = [math]::Round($StartLat + (($EndLat - $StartLat) * $ratio), 6)
    $lon = [math]::Round($StartLon + (($EndLon - $StartLon) * $ratio), 6)
    $speed = [math]::Round($Speeds[$index], 2)
    $course = [math]::Round($Courses[$index], 2)

    $lines.Add(('vehicle_latitude{{device_id="{0}"}} {1} {2}' -f $DeviceId, $lat, $timestamp))
    $lines.Add(('vehicle_longitude{{device_id="{0}"}} {1} {2}' -f $DeviceId, $lon, $timestamp))
    $lines.Add(('vehicle_speed{{device_id="{0}"}} {1} {2}' -f $DeviceId, $speed, $timestamp))
    $lines.Add(('vehicle_course{{device_id="{0}"}} {1} {2}' -f $DeviceId, $course, $timestamp))
  }

  return $lines
}

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$cloudRoot = Split-Path -Parent $scriptRoot
$postgresEnv = Read-DotEnv (Join-Path $cloudRoot 'Tracking_PostgreSQL/.env')
$sqlPath = Join-Path $cloudRoot 'Tracking_PostgreSQL/scripts/seed-local-audit-mock-data.sql'
$tempMetricsPath = Join-Path $env:TEMP 'local-audit-metrics.prom'

Write-Host '[1/3] Reapplying PostgreSQL local audit seed...'
Get-Content -Raw -Path $sqlPath | docker exec -i tracking-postgres psql -v ON_ERROR_STOP=1 -U $postgresEnv.POSTGRES_USER -d $postgresEnv.POSTGRES_DB | Out-Null

Write-Host '[2/3] Importing VictoriaMetrics telemetry for trip replay...'
$token = Get-AuthToken
$tripMap = Get-TripMap -Token $token
$trip1 = $tripMap['MOCK-TRIP-001']
$trip2 = $tripMap['MOCK-TRIP-002']

if (-not $trip1 -or -not $trip2) {
  throw 'Expected MOCK-TRIP-001 and MOCK-TRIP-002 to exist after seed.'
}

$lines = New-Object System.Collections.Generic.List[string]
foreach ($line in (New-InterpolatedPoints -DeviceId 'TRACKER_001' -Start ([datetime]$trip1.actualStart) -End ([datetime]$trip1.actualEnd) -StartLat 10.775843 -StartLon 106.700981 -EndLat 10.781294 -EndLon 106.697214 -Speeds @(0,18,28,34,31,26,12,0) -Courses @(92,95,102,108,115,123,131,137))) {
  $lines.Add([string]$line)
}
$trip2End = (Get-Date).ToUniversalTime().AddMinutes(-1)
if ($trip2End -le ([datetime]$trip2.actualStart).ToUniversalTime()) {
  $trip2End = ([datetime]$trip2.actualStart).ToUniversalTime().AddMinutes(45)
}
foreach ($line in (New-InterpolatedPoints -DeviceId 'MOCK-OBD-002' -Start ([datetime]$trip2.actualStart) -End $trip2End -StartLat 10.854221 -StartLon 106.771138 -EndLat 10.730644 -EndLon 106.719981 -Speeds @(0,24,38,52,49,43,31,18,0) -Courses @(185,191,197,202,208,214,220,227,233))) {
  $lines.Add([string]$line)
}
Set-Content -Path $tempMetricsPath -Value ($lines -join "`n") -Encoding UTF8

docker cp $tempMetricsPath tracking-victoriametrics:/tmp/local-audit-metrics.prom | Out-Null
docker exec tracking-victoriametrics sh -lc "wget -qO- --header='Content-Type: text/plain' --post-file=/tmp/local-audit-metrics.prom http://127.0.0.1:8428/api/v1/import/prometheus >/tmp/local-audit-import.out && cat /tmp/local-audit-import.out && rm -f /tmp/local-audit-metrics.prom /tmp/local-audit-import.out" | Out-Null

Write-Host '[3/3] Sending sample device commands for command history...'
$headers = @{ Authorization = "Bearer $token"; 'Content-Type' = 'application/json' }
$commands = @(
  @{ deviceId = 'MOCK-OBD-002'; command = 'syncConfig'; params = @{ profile = 'audit-local'; intervalSeconds = 180 } },
  @{ deviceId = 'MOCK-OBD-002'; command = 'requestDiagnostics'; params = @{ includeDtc = $true; includeFreezeFrame = $true } },
  @{ deviceId = 'TRACKER_001'; command = 'requestLocationSnapshot'; params = @{ reason = 'trip-replay-audit' } }
)
foreach ($item in $commands) {
  $body = @{ command = $item.command; params = $item.params } | ConvertTo-Json -Depth 6 -Compress
  Invoke-RestMethod -Method Post -Uri ("http://localhost:4000/api/v1/devices/{0}/command" -f $item.deviceId) -Headers $headers -Body $body | Out-Null
}

Write-Host 'Local audit runtime seed complete.'
