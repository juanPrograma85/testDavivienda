param(
  [Parameter(Mandatory = $true)]
  [string]$BackupPath,
  [string]$EnvFile = ".env.docker"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupPath)) {
  throw "Backup file not found: $BackupPath"
}

$resolvedBackup = (Resolve-Path $BackupPath).Path
$composeEnv = @()
if (Test-Path $EnvFile) {
  $composeEnv = @("--env-file", $EnvFile)
}
$containerBackup = "/tmp/flight_booking-restore.dump"

# Prevent writes while restoring and ensure PostgreSQL is available.
docker compose @composeEnv stop backend 2>$null
docker compose @composeEnv up -d postgres
if ($LASTEXITCODE -ne 0) {
  throw "Could not start PostgreSQL"
}

$containerId = docker compose @composeEnv ps -q postgres
if (-not $containerId) {
  throw "PostgreSQL container was not found"
}

docker cp $resolvedBackup "${containerId}:$containerBackup"
if ($LASTEXITCODE -ne 0) {
  throw "Could not copy the backup into the PostgreSQL container"
}

$database = (docker compose @composeEnv exec -T postgres printenv POSTGRES_DB).Trim()
$user = (docker compose @composeEnv exec -T postgres printenv POSTGRES_USER).Trim()

docker compose @composeEnv exec -T postgres pg_restore `
  --username $user `
  --dbname $database `
  --clean `
  --if-exists `
  --no-owner `
  --no-privileges `
  --exit-on-error `
  $containerBackup

$restoreExitCode = $LASTEXITCODE
docker compose @composeEnv exec -T postgres rm -f $containerBackup

if ($restoreExitCode -ne 0) {
  throw "pg_restore failed with exit code $restoreExitCode. The backend remains stopped."
}

docker compose @composeEnv up -d backend
Write-Host "Database restored from: $resolvedBackup"
