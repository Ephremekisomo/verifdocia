param(
  [int]$Port = 5173
)

Set-Location -Path $PSScriptRoot

function Has-Npm {
  if (Get-Command npm -ErrorAction SilentlyContinue) { return $true }
  return $false
}

if (-not (Has-Npm)) {
  Write-Error "Node.js et npm ne sont pas installés. Installez Node.js depuis https://nodejs.org/ et réessayez."
  exit 1
}

if (!(Test-Path "node_modules")) {
  npm install
}

npm run dev -- --port $Port
