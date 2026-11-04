param(
    [switch]$Build,
    [switch]$NoBrowser,
    [int]$Port = 0
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$compose = Join-Path $root "infra/docker-compose.demo.yml"
$envExample = Join-Path $root "infra/demo.env.example"
$envFile = Join-Path $root "infra/demo.env"

if (-not (Test-Path $compose)) {
    throw "No se encontro $compose"
}

if (-not (Test-Path $envFile)) {
    Copy-Item $envExample $envFile
    Write-Host "Creado $envFile"
}

docker info *> $null
if ($LASTEXITCODE -ne 0) {
    throw "Docker Desktop no esta corriendo. Abrelo y vuelve a intentar."
}

$composeArgs = @("--env-file", $envFile, "-f", $compose)

$backendImage = "betpulse-backend:demo"
$frontendImage = "betpulse-frontend:demo"

$images = @(docker image ls --format "{{.Repository}}:{{.Tag}}")
$hasBackend = $images -contains $backendImage
$hasFrontend = $images -contains $frontendImage

if ($Build -or -not $hasBackend -or -not $hasFrontend) {
    Write-Host "Construyendo imagenes (puede tardar unos minutos)..."
    docker compose @composeArgs build
    if ($LASTEXITCODE -ne 0) {
        throw "Fallo el build de las imagenes."
    }
}

if ($Port -gt 0) {
    $env:DEMO_PORT = "$Port"
    $envArgs = $composeArgs + @("up", "-d", "--wait")
} else {
    $envArgs = $composeArgs + @("up", "-d", "--wait")
}

Write-Host "Levantando BetPulse..."
docker compose @envArgs
if ($LASTEXITCODE -ne 0) {
    docker compose @composeArgs ps
    throw "No se pudo levantar el stack. Revisa 'docker compose logs'."
}

$mapped = (docker compose @composeArgs port frontend 3000 | Select-Object -First 1).Trim()
$demoPort = 3000
if ($mapped -match ":(\d+)$") {
    $demoPort = [int]$Matches[1]
}

$url = "http://localhost:$demoPort"
Write-Host ""
Write-Host "BetPulse listo en $url"
Write-Host "Admin: admin@betpulse.local / Admin123! (configurable en infra/demo.env)"
Write-Host ""

if (-not $NoBrowser) {
    Start-Process $url
}
