param(
    [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"

& (Join-Path $PSScriptRoot "stop.ps1") -Volumes
& (Join-Path $PSScriptRoot "start.ps1") -NoBrowser:$NoBrowser
