param(
    [int]$Port = 3001
)

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
    throw "Java no esta en PATH. Instalar Java 21."
}

java CaptureGsi.java $Port
