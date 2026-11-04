param(
    [switch]$NoBrowser,
    [int]$Port = 0
)

$ErrorActionPreference = "Stop"

$here = $PSScriptRoot
$compose = Join-Path $here "docker-compose.yml"
$envFile = Join-Path $here ".env"
$tar = Join-Path $here "betpulse-demo-images.tar"

if (-not (Test-Path $compose)) {
    throw "No se encontro docker-compose.yml en $here"
}

if (-not (Test-Path $envFile)) {
    Copy-Item (Join-Path $here ".env.example") $envFile
    Write-Host "Creado .env"
}

$oldPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$null = docker version --format "{{.Server.Version}}" 2>$null
$dockerReady = $LASTEXITCODE -eq 0
$ErrorActionPreference = $oldPreference
if (-not $dockerReady) {
    throw "Docker Desktop no esta corriendo. Abrelo y vuelve a intentar."
}

$images = @(docker image ls --format "{{.Repository}}:{{.Tag}}")
$backendImage = "betpulse-backend:demo"
$frontendImage = "betpulse-frontend:demo"
$postgresImage = "postgres:17-alpine"

$hasBackend = $images -contains $backendImage
$hasFrontend = $images -contains $frontendImage
$hasPostgres = $images -contains $postgresImage

$missing = (-not $hasBackend) -or (-not $hasFrontend) -or (-not $hasPostgres)
if ($missing -and (Test-Path $tar)) {
    Write-Host "Cargando imagenes desde betpulse-demo-images.tar..."
    docker load -i $tar
    if ($LASTEXITCODE -ne 0) {
        throw "No se pudieron cargar las imagenes."
    }
} elseif ($missing) {
    throw "Faltan las imagenes y no se encontro betpulse-demo-images.tar en $here"
}

if ($Port -gt 0) {
    $env:DEMO_PORT = "$Port"
}

$composeArgs = @("--env-file", $envFile, "-f", $compose)
Write-Host "Levantando BetPulse..."
docker compose @composeArgs up -d --wait
if ($LASTEXITCODE -ne 0) {
    docker compose @composeArgs ps
    throw "No se pudo levantar el stack. Revisa los logs con: docker compose logs"
}

$mapped = (docker compose @composeArgs port frontend 3000 | Select-Object -First 1).Trim()
$demoPort = 3000
if ($mapped -match ":(\d+)$") {
    $demoPort = [int]$Matches[1]
}

$url = "http://localhost:$demoPort"
Write-Host ""
Write-Host "BetPulse listo en $url"
Write-Host "Admin: admin@betpulse.local / Admin123!"
Write-Host ""

if (-not $NoBrowser) {
    Start-Process $url
}
