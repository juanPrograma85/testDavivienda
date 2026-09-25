param(
  [string]$OutputDirectory = "backups",
  [string]$EnvFile = ".env.docker"
)

$ErrorActionPreference = "Stop"

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$composeEnv = @()
if (Test-Path $EnvFile) {
  $composeEnv = @("--env-file", $EnvFile)
}
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = Join-Path $OutputDirectory "flight_booking-$timestamp.dump"
$containerId = docker compose @composeEnv ps -q postgres

if (-not $containerId) {
  throw "PostgreSQL is not running. Start it with: docker compose up -d postgres"
}

$database = (docker compose @composeEnv exec -T postgres printenv POSTGRES_DB).Trim()
$user = (docker compose @composeEnv exec -T postgres printenv POSTGRES_USER).Trim()
$containerBackup = "/tmp/flight_booking-$timestamp.dump"

docker compose @composeEnv exec -T postgres pg_dump `
  --username $user `
  --dbname $database `
  --format custom `
  --no-owner `
  --no-privileges `
  --file $containerBackup

if ($LASTEXITCODE -ne 0) {
  throw "pg_dump failed with exit code $LASTEXITCODE"
}

docker cp "${containerId}:$containerBackup" $backupPath
if ($LASTEXITCODE -ne 0) {
  throw "Could not copy the backup from the PostgreSQL container"
}

docker compose @composeEnv exec -T postgres rm -f $containerBackup
Write-Host "Backup created: $backupPath"
