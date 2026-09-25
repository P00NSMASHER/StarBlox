param(
  [string]$RepoRoot = (Get-Location).Path,
  [string]$BundleZip = "",
  [string]$BundleDir = "",
  [string]$InstanceId = "default"
)

$ErrorActionPreference = "Stop"
Set-Location $RepoRoot

if ([string]::IsNullOrWhiteSpace($BundleDir)) {
  $BundleDir = Join-Path $RepoRoot "artifacts\same-day-starblox"
}

if (-not [string]::IsNullOrWhiteSpace($BundleZip)) {
  if (-not (Test-Path $BundleZip)) { throw "Bundle ZIP not found: $BundleZip" }
  if (Test-Path $BundleDir) { Remove-Item $BundleDir -Recurse -Force }
  New-Item -ItemType Directory -Force -Path $BundleDir | Out-Null
  Expand-Archive -Path $BundleZip -DestinationPath $BundleDir -Force
}

$Place = Join-Path $BundleDir "StarBloxSameDay.rbxlx"
if (-not (Test-Path $Place)) { throw "Staging place not found: $Place" }

foreach ($Command in @("node","npm","rojo")) {
  if (-not (Get-Command $Command -ErrorAction SilentlyContinue)) {
    throw "Required command is unavailable: $Command"
  }
}

$PluginOut = Join-Path $RepoRoot "artifacts\StarBloxDevFactoryConnector.rbxm"
New-Item -ItemType Directory -Force -Path (Split-Path $PluginOut) | Out-Null
& rojo build "roblox\devFactoryPlugin\default.project.json" -o $PluginOut
if ($LASTEXITCODE -ne 0) { throw "Could not build StarBlox Studio connector plugin." }

$PluginDir = Join-Path $env:LOCALAPPDATA "Roblox\Plugins"
New-Item -ItemType Directory -Force -Path $PluginDir | Out-Null
Copy-Item $PluginOut (Join-Path $PluginDir "StarBloxDevFactoryConnector.rbxm") -Force

$StudioCandidates = Get-ChildItem (Join-Path $env:LOCALAPPDATA "Roblox\Versions") -Filter RobloxStudioBeta.exe -Recurse -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending
$Studio = $StudioCandidates | Select-Object -First 1
if (-not $Studio) { throw "RobloxStudioBeta.exe was not found under LOCALAPPDATA\Roblox\Versions." }

$BridgeLog = Join-Path $BundleDir "studio-bridge.log"
$BridgeErr = Join-Path $BundleDir "studio-bridge.err.log"
$Bridge = Start-Process -FilePath "node" -ArgumentList @("scripts/studio-bridge.mjs") -WorkingDirectory $RepoRoot -PassThru -WindowStyle Hidden -RedirectStandardOutput $BridgeLog -RedirectStandardError $BridgeErr
$Bridge.Id | Set-Content (Join-Path $BundleDir "studio-bridge.pid")

$env:STARBLOX_STUDIO_INSTANCE_ID = $InstanceId
Start-Process -FilePath $Studio.FullName -ArgumentList @($Place)

$Health = "http://127.0.0.1:38473/health?instanceId=$InstanceId"
$Deadline = (Get-Date).AddSeconds(90)
$Ready = $false
while ((Get-Date) -lt $Deadline) {
  try {
    $Payload = Invoke-RestMethod -Uri $Health -Method Get -TimeoutSec 2
    $EditPeer = @($Payload.peers) | Where-Object {
      $_.role -eq "edit" -and $_.connectorVersion -eq "starblox-studio-connector-v1"
    }
    if ($EditPeer.Count -gt 0) { $Ready = $true; break }
  } catch {}
  Start-Sleep -Milliseconds 750
}
if (-not $Ready) {
  throw "Studio connector did not attest within 90 seconds. Ensure Studio HTTP requests are enabled and the local StarBlox plugin loaded."
}

& node "scripts/same-day-studio-smoke.mjs" --instance-id $InstanceId --out (Join-Path $BundleDir "studio-staging-smoke.json")
if ($LASTEXITCODE -ne 0) { throw "Studio staging smoke verification failed." }

Write-Host ""
Write-Host "StarBlox Studio staging verification: PASS"
Write-Host "Place: $Place"
Write-Host "Receipt: $(Join-Path $BundleDir 'studio-staging-smoke.json')"
Write-Host "Bridge PID: $($Bridge.Id)"
Write-Host "Publication remains disabled."
