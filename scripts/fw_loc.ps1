$ErrorActionPreference = 'Stop'
$root = 'E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system-firmware'
$files = Get-ChildItem -Recurse -Path (Join-Path $root 'components'),(Join-Path $root 'main') -Include *.c,*.h
$rows = foreach ($f in $files) {
    $n = (Get-Content -LiteralPath $f.FullName | Measure-Object -Line).Lines
    [pscustomobject]@{ Lines = $n; Path = $f.FullName.Replace($root + '\','') }
}
$rows | Sort-Object Lines -Descending | ForEach-Object { '{0,5}  {1}' -f $_.Lines, $_.Path }
