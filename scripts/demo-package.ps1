param(
    [switch]$Zip
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$compose = Join-Path $root "infra/docker-compose.demo.yml"
$envFile = Join-Path $root "infra/demo.env"
$kitSource = Join-Path $root "demo-kit"
$distRoot = Join-Path $root "dist"
$stage = Join-Path $distRoot "betpulse-demo-kit"
$tar = Join-Path $stage "betpulse-demo-images.tar"

if (-not (Test-Path $envFile)) {
    Copy-Item (Join-Path $root "infra/demo.env.example") $envFile
}

docker info *> $null
if ($LASTEXITCODE -ne 0) {
    throw "Docker Desktop no esta corriendo."
}

Write-Host "Construyendo imagenes..."
docker compose --env-file $envFile -f $compose build
if ($LASTEXITCODE -ne 0) {
    throw "Fallo el build de las imagenes."
}

Write-Host "Asegurando imagen de PostgreSQL..."
docker pull postgres:17-alpine
if ($LASTEXITCODE -ne 0) {
    throw "No se pudo descargar postgres:17-alpine."
}

if (Test-Path $stage) {
    Remove-Item $stage -Recurse -Force
}
New-Item -ItemType Directory -Path $stage -Force | Out-Null

Get-ChildItem -Path $kitSource -Force | Copy-Item -Destination $stage -Recurse -Force
Copy-Item (Join-Path $kitSource ".env.example") (Join-Path $stage ".env") -Force

Write-Host "Guardando imagenes en el kit (puede tardar varios minutos)..."
docker save -o $tar betpulse-backend:demo betpulse-frontend:demo postgres:17-alpine
if ($LASTEXITCODE -ne 0) {
    throw "No se pudieron guardar las imagenes."
}

$sizeMb = [math]::Round((Get-Item $tar).Length / 1MB, 1)
Write-Host ""
Write-Host "Kit listo en: $stage"
Write-Host "Imagenes: $sizeMb MB"
Write-Host "Copia esa carpeta a la PC de la demo y ejecuta start.ps1."

if ($Zip) {
    $zipPath = Join-Path $distRoot "BetPulse-Demo.zip"
    if (Test-Path $zipPath) {
        Remove-Item $zipPath -Force
    }
    Write-Host "Comprimiendo kit..."
    Compress-Archive -Path (Join-Path $stage "*") -DestinationPath $zipPath -Force
    Write-Host "ZIP: $zipPath"
}
