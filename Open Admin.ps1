$ErrorActionPreference = 'Stop'
$projectPath = $PSScriptRoot
$siteAddress = 'http://localhost:4173'
$running = $false
try { $response = Invoke-WebRequest -UseBasicParsing "$siteAddress/api/content" -TimeoutSec 2; $running = $response.StatusCode -eq 200 } catch {}
if (-not $running) {
  $nodePath = (Get-Command node -ErrorAction Stop).Source
  Start-Process -FilePath $nodePath -ArgumentList 'server.mjs' -WorkingDirectory $projectPath -WindowStyle Hidden -RedirectStandardOutput (Join-Path $projectPath 'server.log') -RedirectStandardError (Join-Path $projectPath 'server-error.log')
  Start-Sleep -Seconds 2
}
$accessKey = (Get-Content -Raw (Join-Path $projectPath 'data\admin-key.txt')).Trim()
Start-Process "$siteAddress/admin#key=$accessKey"
