param(
    [switch]$KeepRunning
)

$ErrorActionPreference = "Continue"
$exitCode = 1
$root = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"
$logDir = Join-Path $root "tmp"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$backendProcess = $null
$frontendProcess = $null
$startedBackend = $false
$startedFrontend = $false

function Test-Url([string]$Url, [int]$Timeout = 2) {
    try {
        $null = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $Timeout
        return $true
    } catch {
        return $false
    }
}

function Wait-Url([string]$Url, [int]$Seconds, [string]$Name) {
    for ($i = 0; $i -lt $Seconds; $i++) {
        if (Test-Url $Url) { return }
        Start-Sleep -Seconds 1
    }
    throw "$Name no respondió en $Seconds s: $Url"
}

try {
    docker info *> $null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker Desktop no está corriendo."
    }

    Write-Host "Asegurando PostgreSQL..."
    docker compose -f (Join-Path $root "infra/docker-compose.yml") up -d postgres *> $null
    if ($LASTEXITCODE -ne 0) {
        throw "No se pudo levantar PostgreSQL."
    }

    if (-not (Test-Url "http://127.0.0.1:8081/api/health")) {
        Write-Host "Arrancando backend..."
        $env:OPENDOTA_SCHEDULER_ENABLED = "false"
        $env:OPENDOTA_RESULT_SCHEDULER_ENABLED = "false"
        $env:ESPN_SCHEDULER_ENABLED = "false"
        $env:FOOTBALL_SCHEDULER_ENABLED = "false"
        $env:BASKETBALL_SCHEDULER_ENABLED = "false"
        $env:RATE_LIMIT_ENABLED = "false"
        $backendProcess = Start-Process -FilePath (Join-Path $backendDir "mvnw.cmd") `
            -ArgumentList "-q", "spring-boot:run" `
            -WorkingDirectory $backendDir `
            -RedirectStandardOutput (Join-Path $logDir "e2e-backend.log") `
            -RedirectStandardError (Join-Path $logDir "e2e-backend.err.log") `
            -WindowStyle Hidden -PassThru
        $startedBackend = $true
        Wait-Url "http://127.0.0.1:8081/api/health" 180 "Backend"
    } else {
        Write-Host "Backend ya está corriendo en 8081."
    }

    if (-not (Test-Url "http://127.0.0.1:3000/")) {
        Write-Host "Arrancando frontend..."
        $env:BACKEND_URL = "http://127.0.0.1:8081"
        $frontendProcess = Start-Process -FilePath "npm.cmd" `
            -ArgumentList "run", "dev" `
            -WorkingDirectory $frontendDir `
            -RedirectStandardOutput (Join-Path $logDir "e2e-frontend.log") `
            -RedirectStandardError (Join-Path $logDir "e2e-frontend.err.log") `
            -WindowStyle Hidden -PassThru
        $startedFrontend = $true
        Wait-Url "http://127.0.0.1:3000/" 180 "Frontend"
    } else {
        Write-Host "Frontend ya está corriendo en 3000."
    }

    Push-Location $frontendDir
    try {
        Write-Host "Instalando Chromium de Playwright (si hace falta)..."
        & npx.cmd playwright install chromium
        if ($LASTEXITCODE -ne 0) { throw "No se pudo instalar Chromium." }

        $env:E2E_BASE_URL = "http://127.0.0.1:3000"
        $env:E2E_BACKEND_URL = "http://127.0.0.1:8081"
        if (-not $env:E2E_INGEST_SECRET) {
            $env:E2E_INGEST_SECRET = "betpulse-dev-ingest-secret"
        }

        Write-Host "Ejecutando E2E..."
        & npx.cmd playwright test
        $exitCode = if ($LASTEXITCODE -eq 0) { 0 } else { 1 }
    } finally {
        Pop-Location
    }
} finally {
    if ($KeepRunning) {
        Write-Host "Servicios dejados en ejecución (-KeepRunning)."
    } else {
        if ($startedFrontend -and $frontendProcess) {
            taskkill /PID $frontendProcess.Id /T /F *> $null
        }
        if ($startedBackend -and $backendProcess) {
            taskkill /PID $backendProcess.Id /T /F *> $null
        }
    }
}

if ($exitCode -ne 0) {
    Write-Host "E2E falló. Logs en tmp/e2e-*.log y artifacts en frontend/test-results."
}
exit $exitCode
