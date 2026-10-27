param(
    [string]$DotaPath = ""
)

$ErrorActionPreference = "Stop"

if (-not $DotaPath) {
    $steamPath = $null
    try {
        $steamPath = (Get-ItemProperty -Path "HKCU:\Software\Valve\Steam" -ErrorAction Stop).SteamPath
    } catch {
        $steamPath = $null
    }

    if ($steamPath) {
        $DotaPath = Join-Path $steamPath "steamapps\common\dota 2 beta"
    } else {
        $DotaPath = "C:\Program Files (x86)\Steam\steamapps\common\dota 2 beta"
    }
}

$source = Join-Path $PSScriptRoot "gsi-capture\gamestate_integration_betpulse.cfg"
if (-not (Test-Path -LiteralPath $source)) {
    throw "No se encontro el archivo fuente: $source"
}

$destDir = Join-Path $DotaPath "game\dota\cfg\gamestate_integration"
$dest = Join-Path $destDir "gamestate_integration_betpulse.cfg"

New-Item -ItemType Directory -Force -Path $destDir | Out-Null
Copy-Item -LiteralPath $source -Destination $dest -Force

Write-Host "GSI instalado en:"
Write-Host "  $dest"
Write-Host ""
Write-Host "Siguiente paso: agregar -gamestateintegration en Opciones de lanzamiento de Dota 2."
