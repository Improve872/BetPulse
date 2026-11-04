param(
    [switch]$Volumes
)

$ErrorActionPreference = "Stop"

$here = $PSScriptRoot
$compose = Join-Path $here "docker-compose.yml"
$envFile = Join-Path $here ".env"

$composeArgs = @("-f", $compose)
if (Test-Path $envFile) {
    $composeArgs = @("--env-file", $envFile) + $composeArgs
}

if ($Volumes) {
    docker compose @composeArgs down -v
    Write-Host "BetPulse detenido y base de datos eliminada."
} else {
    docker compose @composeArgs down
    Write-Host "BetPulse detenido. Los datos se conservan."
}
