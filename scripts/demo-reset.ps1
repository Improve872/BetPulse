param(
    [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot

& (Join-Path $PSScriptRoot "demo-down.ps1") -Volumes
if ($LASTEXITCODE -ne 0) {
    throw "No se pudo detener el stack."
}

& (Join-Path $PSScriptRoot "demo-up.ps1") -NoBrowser:$NoBrowser
