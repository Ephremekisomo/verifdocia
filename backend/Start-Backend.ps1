param(
  [string]$ApiHost = "127.0.0.1",
  [int]$ApiPort = 8000
)

Set-Location -Path $PSScriptRoot

function Get-PythonCmd {
  if (Get-Command py -ErrorAction SilentlyContinue) {
    return "py -3"
  }
  if (Get-Command python -ErrorAction SilentlyContinue) {
    return "python"
  }
  return $null
}

$pythonCmd = Get-PythonCmd
if (-not $pythonCmd) {
  Write-Error "Python n'est pas installé ou non détecté dans PATH. Installez Python 3.x (via python.org ou 'winget install Python.Python.3.12'), puis réexécutez ce script."
  exit 1
}

if (!(Test-Path ".venv")) {
  iex "$pythonCmd -m venv .venv"
}

. ".\.venv\Scripts\Activate.ps1"

$venvPython = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
& $venvPython -m pip install --upgrade pip
& $venvPython -m pip install -r requirements.txt

& $venvPython -m uvicorn main:app --host $ApiHost --port $ApiPort
