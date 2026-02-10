#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Rollback Patient Tracker to a previous version.

.DESCRIPTION
    Stops the application, optionally restores a database backup, pulls the
    specified older version images, and restarts.

.PARAMETER Version
    The version to roll back to (required). E.g., "1.2.3" or "latest".

.PARAMETER InstallDir
    Installation directory. Default: C:\patient-tracker

.PARAMETER BackupFile
    Path to a .sql backup file to restore.

.PARAMETER SkipDbRestore
    Skip database restore even if BackupFile is provided.

.EXAMPLE
    .\rollback.ps1 -Version 1.2.3
    .\rollback.ps1 -Version 1.2.3 -BackupFile C:\patient-tracker\backups\patient-tracker-20260209-120000.sql
    .\rollback.ps1 -Version 1.0.0 -SkipDbRestore
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Version,

    [string]$InstallDir = "C:\patient-tracker",
    [string]$BackupFile,
    [switch]$SkipDbRestore
)

$ErrorActionPreference = "Stop"

# --- Helpers ---

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "=== $Message ===" -ForegroundColor Cyan
}

function Write-Ok {
    param([string]$Message)
    Write-Host "  [OK] $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "  [WARN] $Message" -ForegroundColor Yellow
}

function Write-Fail {
    param([string]$Message)
    Write-Host "  [FAIL] $Message" -ForegroundColor Red
}

# --- Validate ---

$composePath = Join-Path $InstallDir "docker-compose.yml"
$envPath = Join-Path $InstallDir ".env"

if (-not (Test-Path $composePath)) {
    Write-Fail "docker-compose.yml not found in $InstallDir"
    exit 1
}

if ($BackupFile -and -not $SkipDbRestore) {
    if (-not (Test-Path $BackupFile)) {
        Write-Fail "Backup file not found: $BackupFile"
        exit 1
    }

    # Warn if backup is older than 24 hours
    $backupAge = (Get-Date) - (Get-Item $BackupFile).LastWriteTime
    if ($backupAge.TotalHours -gt 24) {
        Write-Warn "Backup file is $([math]::Round($backupAge.TotalHours, 1)) hours old!"
        Write-Host "  File: $BackupFile"
        Write-Host "  Data created after this backup will be lost."
        $confirm = Read-Host "Continue with this backup? (y/N)"
        if ($confirm -ne 'y') {
            Write-Host "Rollback cancelled."
            exit 0
        }
    }
}

# --- Confirm ---

Write-Step "Rollback Plan"

Write-Host "  Target version:   $Version"
Write-Host "  Install directory: $InstallDir"
if ($BackupFile -and -not $SkipDbRestore) {
    Write-Host "  Database restore:  $BackupFile"
} elseif ($SkipDbRestore) {
    Write-Host "  Database restore:  SKIPPED"
} else {
    Write-Host "  Database restore:  None (no backup file specified)"
}
Write-Host ""

$confirm = Read-Host "Proceed with rollback? (y/N)"
if ($confirm -ne 'y') {
    Write-Host "Rollback cancelled."
    exit 0
}

# --- Stop App Containers (keep DB running for restore) ---

Write-Step "Stopping application containers"

Push-Location $InstallDir
try {
    docker compose stop app web nginx 2>&1 | ForEach-Object { Write-Host "  $_" }
    Write-Ok "Application containers stopped (database still running)"
} finally {
    Pop-Location
}

# --- Restore Database ---

if ($BackupFile -and -not $SkipDbRestore) {
    Write-Step "Restoring database from backup"

    Push-Location $InstallDir
    try {
        # Ensure db is running
        docker compose up -d db 2>&1 | Out-Null
        Start-Sleep -Seconds 5

        # Drop and recreate
        Write-Host "  Dropping existing database..."
        docker compose exec -T db psql -U appuser -d postgres -c "DROP DATABASE IF EXISTS patienttracker;" 2>&1 | Out-Null
        docker compose exec -T db psql -U appuser -d postgres -c "CREATE DATABASE patienttracker;" 2>&1 | Out-Null

        # Restore from backup using cmd /c to avoid PowerShell encoding issues
        Write-Host "  Restoring from backup..."
        cmd /c "type `"$BackupFile`" | docker compose exec -T db psql -U appuser -d patienttracker 2>&1"

        if ($LASTEXITCODE -eq 0) {
            Write-Ok "Database restored from $BackupFile"
        } else {
            Write-Warn "Database restore completed with warnings (this is often normal for pg_dump output)"
        }
    } finally {
        Pop-Location
    }
}

# --- Update VERSION in .env ---

Write-Step "Setting version to $Version"

$envContent = Get-Content $envPath -Raw
if ($envContent -match "VERSION=.+") {
    $envContent = $envContent -replace "VERSION=.+", "VERSION=$Version"
} else {
    $envContent += "`nVERSION=$Version`n"
}
$envContent | Set-Content $envPath -NoNewline

Write-Ok "VERSION set to $Version in .env"

# --- Pull Old Version Images ---

Write-Step "Pulling version $Version images"

Push-Location $InstallDir
try {
    docker compose pull 2>&1 | ForEach-Object { Write-Host "  $_" }
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Failed to pull images for version $Version."
        Write-Host "  The version tag may not exist. Check available tags at:"
        Write-Host "  https://github.com/orgs/joyhe1234-coder/packages"
        exit 1
    }
    Write-Ok "Images pulled for version $Version"
} finally {
    Pop-Location
}

# --- Start Everything ---

Write-Step "Starting containers"

Push-Location $InstallDir
try {
    docker compose up -d 2>&1 | ForEach-Object { Write-Host "  $_" }
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Failed to start containers."
        exit 1
    }
    Write-Ok "All containers started"
} finally {
    Pop-Location
}

# --- Health Check ---

Write-Step "Waiting for application to become healthy"

# Read APP_URL from .env
$appUrl = "http://localhost"
foreach ($line in (Get-Content $envPath)) {
    if ($line -match "^APP_URL=(.+)$") {
        $appUrl = $Matches[1]
    }
}

$healthUrl = "$appUrl/api/health"
$timeout = 120
$elapsed = 0
$interval = 5
$healthy = $false

while ($elapsed -lt $timeout) {
    try {
        $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $healthy = $true
            break
        }
    } catch { }

    Write-Host "  Waiting... ($elapsed/$timeout seconds)" -NoNewline
    Write-Host "`r" -NoNewline
    Start-Sleep -Seconds $interval
    $elapsed += $interval
}

Write-Host ""

if ($healthy) {
    Write-Ok "Application is healthy!"
    Write-Host ""
    Write-Host "  Rollback to version $Version complete." -ForegroundColor Green
} else {
    Write-Fail "Health check timed out after ${timeout}s."
    Write-Host ""
    Write-Host "  Check logs: docker compose -f `"$composePath`" logs -f" -ForegroundColor Yellow
}
