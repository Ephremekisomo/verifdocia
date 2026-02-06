param(
  [string]$ApiHost = "127.0.0.1",
  [int]$ApiPort = 8000,
  [int]$WebPort = 5173
)

$root = $PSScriptRoot
$backendScript = Join-Path $root "backend\Start-Backend.ps1"
$frontendScript = Join-Path $root "frontend\Start-Frontend.ps1"

if (!(Test-Path $backendScript)) { Write-Error "Backend script manquant: $backendScript"; exit 1 }
if (!(Test-Path $frontendScript)) { Write-Error "Frontend script manquant: $frontendScript"; exit 1 }

function GetShell {
  if (Get-Command pwsh -ErrorAction SilentlyContinue) { return "pwsh" }
  if (Get-Command powershell -ErrorAction SilentlyContinue) { return "powershell" }
  return $null
}

$shell = GetShell
if (-not $shell) { Write-Error "Aucun shell PowerShell trouvé"; exit 1 }

$backendArgs = "-NoExit -ExecutionPolicy Bypass -File `"$backendScript`" -ApiHost $ApiHost -ApiPort $ApiPort"
$frontendArgs = "-NoExit -ExecutionPolicy Bypass -File `"$frontendScript`" -Port $WebPort"

Start-Process -FilePath $shell -ArgumentList $backendArgs -WorkingDirectory (Split-Path $backendScript -Parent)
Start-Process -FilePath $shell -ArgumentList $frontendArgs -WorkingDirectory (Split-Path $frontendScript -Parent)
