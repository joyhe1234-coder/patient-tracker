#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Update Patient Tracker to a new version.

.DESCRIPTION
    Backs up the database, pulls new Docker images, and restarts the application.
    If the update fails, provides rollback instructions.

.PARAMETER InstallDir
    Installation directory. Default: C:\patient-tracker

.PARAMETER Version
    Target version to deploy (e.g., "1.2.3"). Default: "latest"

.PARAMETER SkipBackup
    Skip database backup before updating.

.EXAMPLE
    .\update.ps1
    .\update.ps1 -Version 1.2.3
    .\update.ps1 -InstallDir D:\apps\patient-tracker -Version 2.0.0
#>
[CmdletBinding()]
param(
    [string]$InstallDir = "C:\patient-tracker",
    [string]$Version = "latest",
    [switch]$SkipBackup
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

# --- Validate Install Directory ---

$composePath = Join-Path $InstallDir "docker-compose.yml"
$envPath = Join-Path $InstallDir ".env"

if (-not (Test-Path $composePath)) {
    Write-Fail "docker-compose.yml not found in $InstallDir"
    Write-Host "  Is Patient Tracker installed? Run install-windows.ps1 first."
    exit 1
}

if (-not (Test-Path $envPath)) {
    Write-Fail ".env file not found in $InstallDir"
    exit 1
}

# --- Show Current vs Target ---

Write-Step "Update Plan"

# Read current version from .env
$currentVersion = "unknown"
$envLines = Get-Content $envPath
foreach ($line in $envLines) {
    if ($line -match "^VERSION=(.+)$") {
        $currentVersion = $Matches[1]
    }
}

Write-Host "  Current version:  $currentVersion"
Write-Host "  Target version:   $Version"
Write-Host "  Install directory: $InstallDir"
Write-Host ""

$confirm = Read-Host "Proceed with update? (y/N)"
if ($confirm -ne 'y') {
    Write-Host "Update cancelled."
    exit 0
}

# --- Backup Database ---

$backupFile = $null

if (-not $SkipBackup) {
    Write-Step "Backing up database"

    $backupScript = Join-Path $InstallDir "scripts\backup.ps1"

    if (Test-Path $backupScript) {
        # Use the enhanced backup script (encrypted, off-site, logged)
        Write-Host "  Running backup.ps1..."
        & $backupScript -InstallDir $InstallDir
        if ($LASTEXITCODE -ne 0) {
            Write-Warn "Backup script reported an error."
            $continueAnyway = Read-Host "Continue without backup? (y/N)"
            if ($continueAnyway -ne 'y') {
                Write-Host "Update cancelled."
                exit 1
            }
        } else {
            # Find the most recent backup file
            $backupDir = Join-Path $InstallDir "backups"
            $latestBackup = Get-ChildItem $backupDir -Filter "patient-tracker-*" -File |
                Sort-Object LastWriteTime -Descending | Select-Object -First 1
            if ($latestBackup) {
                $backupFile = $latestBackup.FullName
                Write-Ok "Backup saved: $backupFile"
            }
        }
    } else {
        # Fallback: inline pg_dump if backup.ps1 is not available
        Write-Warn "backup.ps1 not found — falling back to inline pg_dump."

        $backupDir = Join-Path $InstallDir "backups"
        if (-not (Test-Path $backupDir)) {
            New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
        }

        $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
        $backupFile = Join-Path $backupDir "patient-tracker-$timestamp.sql"

        Push-Location $InstallDir
        try {
            $dbContainer = docker compose ps -q db 2>&1
            if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($dbContainer)) {
                Write-Warn "Database container not running. Skipping backup."
            } else {
                cmd /c "docker compose exec -T db pg_dump -U appuser -d patienttracker > `"$backupFile`" 2>&1"
                if ($LASTEXITCODE -eq 0 -and (Test-Path $backupFile) -and (Get-Item $backupFile).Length -gt 0) {
                    $sizeMB = [math]::Round((Get-Item $backupFile).Length / 1MB, 2)
                    Write-Ok "Backup saved: $backupFile ($sizeMB MB)"
                } else {
                    Write-Warn "Backup may have failed. Check $backupFile"
                    $continueAnyway = Read-Host "Continue without backup? (y/N)"
                    if ($continueAnyway -ne 'y') {
                        Write-Host "Update cancelled."
                        exit 1
                    }
                }
            }
        } finally {
            Pop-Location
        }
    }
} else {
    Write-Warn "Backup skipped (--SkipBackup)"
}

# --- Update VERSION in .env ---

Write-Step "Updating version in .env"

$envContent = Get-Content $envPath -Raw
if ($envContent -match "VERSION=.+") {
    $envContent = $envContent -replace "VERSION=.+", "VERSION=$Version"
} else {
    $envContent += "`nVERSION=$Version`n"
}
$envContent | Set-Content $envPath -NoNewline

Write-Ok "VERSION set to $Version"

# --- Pull New Images ---

Write-Step "Pulling new images"

Push-Location $InstallDir
try {
    docker compose pull 2>&1 | ForEach-Object { Write-Host "  $_" }
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Failed to pull images."
        Write-Host ""
        Write-Host "  The old version is still running. No changes were made." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  Common causes:" -ForegroundColor Yellow
        Write-Host "    - GHCR token expired: docker login ghcr.io"
        Write-Host "    - Version tag doesn't exist: check releases"
        Write-Host "    - Network issue: check connectivity"

        # Revert .env version
        $envContent = $envContent -replace "VERSION=$Version", "VERSION=$currentVersion"
        $envContent | Set-Content $envPath -NoNewline

        exit 1
    }
    Write-Ok "New images pulled successfully"
} finally {
    Pop-Location
}

# --- Restart Containers ---

Write-Step "Restarting containers"

Push-Location $InstallDir
try {
    docker compose up -d 2>&1 | ForEach-Object { Write-Host "  $_" }
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Failed to start containers with new images."
        Write-Host ""
        Write-Host "  Rollback command:" -ForegroundColor Yellow
        if ($backupFile) {
            Write-Host "    .\scripts\rollback.ps1 -Version $currentVersion -BackupFile `"$backupFile`"" -ForegroundColor Yellow
        } else {
            Write-Host "    .\scripts\rollback.ps1 -Version $currentVersion" -ForegroundColor Yellow
        }
        exit 1
    }
    Write-Ok "Containers restarted"
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
if ($appUrl -eq "http://localhost") {
    $healthUrl = "http://localhost/api/health"
}

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
    } catch {
        # Expected while containers are restarting
    }

    Write-Host "  Waiting... ($elapsed/$timeout seconds)" -NoNewline
    Write-Host "`r" -NoNewline
    Start-Sleep -Seconds $interval
    $elapsed += $interval
}

Write-Host ""

if ($healthy) {
    Write-Ok "Application is healthy!"
    Write-Host ""
    Write-Host "  Update complete: $currentVersion -> $Version" -ForegroundColor Green
    if ($backupFile) {
        Write-Host "  Backup saved at: $backupFile" -ForegroundColor Green
    }
} else {
    Write-Fail "Health check timed out after ${timeout}s."
    Write-Host ""
    Write-Host "  The containers may still be starting (migrations running)." -ForegroundColor Yellow
    Write-Host "  Check logs: docker compose -f `"$composePath`" logs -f app" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  If the app does not recover, rollback with:" -ForegroundColor Yellow
    if ($backupFile) {
        Write-Host "    .\scripts\rollback.ps1 -Version $currentVersion -BackupFile `"$backupFile`"" -ForegroundColor Yellow
    } else {
        Write-Host "    .\scripts\rollback.ps1 -Version $currentVersion" -ForegroundColor Yellow
    }
}
