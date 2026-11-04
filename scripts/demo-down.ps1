param(
    [switch]$Volumes
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$compose = Join-Path $root "infra/docker-compose.demo.yml"
$envFile = Join-Path $root "infra/demo.env"

$composeArgs = @("-f", $compose)
if (Test-Path $envFile) {
    $composeArgs = @("--env-file", $envFile) + $composeArgs
}

if ($Volumes) {
    docker compose @composeArgs down -v
    Write-Host "Stack detenido y base de datos eliminada."
} else {
    docker compose @composeArgs down
    Write-Host "Stack detenido. Los datos se conservan."
}
