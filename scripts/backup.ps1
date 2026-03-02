#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Automated encrypted backup for Patient Tracker database.

.DESCRIPTION
    Performs a full PostgreSQL backup with compression, AES-256 encryption via 7-Zip,
    optional off-site copy to a network share, GFS (Grandfather-Father-Son) retention
    cleanup, and logging. Designed for Windows Server on-premise deployments.

.PARAMETER InstallDir
    Installation directory. Default: C:\patient-tracker

.PARAMETER SkipOffsite
    Skip copying backup to the off-site network share.

.PARAMETER SkipEncryption
    Skip encryption (produce .sql.gz only, not .sql.gz.7z).

.EXAMPLE
    .\backup.ps1
    .\backup.ps1 -InstallDir D:\apps\patient-tracker
    .\backup.ps1 -SkipOffsite
#>
[CmdletBinding()]
param(
    [string]$InstallDir = "C:\patient-tracker",
    [switch]$SkipOffsite,
    [switch]$SkipEncryption
)

$ErrorActionPreference = "Stop"

# --- Configuration from .env ---

$envPath = Join-Path $InstallDir ".env"
$backupDir = Join-Path $InstallDir "backups"
$logFile = Join-Path $backupDir "backup.log"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$startTime = Get-Date

# Defaults
$encryptionKey = ""
$offsitePath = ""
$retainDaily = 7
$retainWeekly = 4
$retainMonthly = 12

# Read config from .env
if (Test-Path $envPath) {
    foreach ($line in (Get-Content $envPath)) {
        if ($line -match "^BACKUP_ENCRYPTION_KEY=(.+)$") { $encryptionKey = $Matches[1].Trim() }
        if ($line -match "^BACKUP_OFFSITE_PATH=(.+)$") { $offsitePath = $Matches[1].Trim() }
        if ($line -match "^BACKUP_RETENTION_DAILY=(\d+)$") { $retainDaily = [int]$Matches[1] }
        if ($line -match "^BACKUP_RETENTION_WEEKLY=(\d+)$") { $retainWeekly = [int]$Matches[1] }
        if ($line -match "^BACKUP_RETENTION_MONTHLY=(\d+)$") { $retainMonthly = [int]$Matches[1] }
    }
}

# --- Helpers ---

function Write-Log {
    param([string]$Level, [string]$Message)
    $entry = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [$Level] $Message"
    Add-Content -Path $logFile -Value $entry -ErrorAction SilentlyContinue
    switch ($Level) {
        "OK"   { Write-Host "  [OK] $Message" -ForegroundColor Green }
        "WARN" { Write-Host "  [WARN] $Message" -ForegroundColor Yellow }
        "FAIL" { Write-Host "  [FAIL] $Message" -ForegroundColor Red }
        default { Write-Host "  $Message" }
    }
}

function Write-EventLogEntry {
    param([string]$Message, [string]$EntryType = "Warning")
    try {
        $source = "PatientTrackerBackup"
        if (-not [System.Diagnostics.EventLog]::SourceExists($source)) {
            [System.Diagnostics.EventLog]::CreateEventSource($source, "Application")
        }
        Write-EventLog -LogName Application -Source $source -EventId 1001 -EntryType $EntryType -Message $Message
    } catch {
        # Non-critical — log locally only
        Write-Log "WARN" "Could not write Windows Event Log: $_"
    }
}

function Get-7ZipPath {
    $paths = @(
        "C:\Program Files\7-Zip\7z.exe",
        "C:\Program Files (x86)\7-Zip\7z.exe",
        (Get-Command 7z -ErrorAction SilentlyContinue).Source
    )
    foreach ($p in $paths) {
        if ($p -and (Test-Path $p)) { return $p }
    }
    return $null
}

# --- Pre-flight Checks ---

Write-Host ""
Write-Host "=== Patient Tracker Backup ===" -ForegroundColor Cyan

$composePath = Join-Path $InstallDir "docker-compose.yml"
if (-not (Test-Path $composePath)) {
    Write-Log "FAIL" "docker-compose.yml not found in $InstallDir. Is Patient Tracker installed?"
    exit 1
}

if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

# --- Step 1: pg_dump ---

Write-Host ""
Write-Host "--- Step 1: Database dump ---" -ForegroundColor Cyan

$sqlFile = Join-Path $backupDir "patient-tracker-$timestamp.sql"

Push-Location $InstallDir
try {
    $dbContainer = docker compose ps -q db 2>&1
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($dbContainer)) {
        Write-Log "FAIL" "Database container is not running."
        Write-EventLogEntry "Patient Tracker backup FAILED: database container not running."
        exit 1
    }

    # Dump using cmd /c to avoid PowerShell UTF-16 encoding
    cmd /c "docker compose exec -T db pg_dump -U appuser -d patienttracker > `"$sqlFile`" 2>&1"

    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $sqlFile) -or (Get-Item $sqlFile).Length -eq 0) {
        Write-Log "FAIL" "pg_dump failed or produced an empty file."
        Write-EventLogEntry "Patient Tracker backup FAILED: pg_dump error."
        exit 1
    }

    $sqlSizeMB = [math]::Round((Get-Item $sqlFile).Length / 1MB, 2)
    Write-Log "OK" "Database dump created: $sqlFile ($sqlSizeMB MB)"
} finally {
    Pop-Location
}

# --- Step 2: Compress with gzip ---

Write-Host ""
Write-Host "--- Step 2: Compress ---" -ForegroundColor Cyan

$gzFile = "$sqlFile.gz"

try {
    # Use PowerShell .NET gzip
    $inputStream = [System.IO.File]::OpenRead($sqlFile)
    $outputStream = [System.IO.File]::Create($gzFile)
    $gzipStream = New-Object System.IO.Compression.GZipStream($outputStream, [System.IO.Compression.CompressionMode]::Compress)
    $inputStream.CopyTo($gzipStream)
    $gzipStream.Close()
    $outputStream.Close()
    $inputStream.Close()

    # Remove uncompressed SQL file
    Remove-Item $sqlFile -Force

    $gzSizeMB = [math]::Round((Get-Item $gzFile).Length / 1MB, 2)
    Write-Log "OK" "Compressed to: $gzFile ($gzSizeMB MB)"
} catch {
    Write-Log "FAIL" "Compression failed: $_"
    Write-EventLogEntry "Patient Tracker backup FAILED: compression error — $_"
    exit 1
}

# --- Step 3: Encrypt with 7-Zip AES-256 ---

$finalFile = $gzFile  # Default if encryption is skipped

if (-not $SkipEncryption) {
    Write-Host ""
    Write-Host "--- Step 3: Encrypt ---" -ForegroundColor Cyan

    if ([string]::IsNullOrWhiteSpace($encryptionKey)) {
        Write-Log "WARN" "BACKUP_ENCRYPTION_KEY not set in .env — skipping encryption."
    } else {
        $sevenZip = Get-7ZipPath
        if (-not $sevenZip) {
            Write-Log "WARN" "7-Zip not found — skipping encryption. Install from https://7-zip.org/"
        } else {
            $encFile = "$gzFile.7z"
            & $sevenZip a -t7z -mhe=on "-p$encryptionKey" $encFile $gzFile 2>&1 | Out-Null

            if ($LASTEXITCODE -eq 0 -and (Test-Path $encFile) -and (Get-Item $encFile).Length -gt 0) {
                Remove-Item $gzFile -Force
                $finalFile = $encFile
                $encSizeMB = [math]::Round((Get-Item $encFile).Length / 1MB, 2)
                Write-Log "OK" "Encrypted: $encFile ($encSizeMB MB)"
            } else {
                Write-Log "WARN" "Encryption failed — keeping unencrypted backup."
            }
        }
    }
} else {
    Write-Host ""
    Write-Host "--- Step 3: Encrypt (skipped) ---" -ForegroundColor Cyan
    Write-Log "WARN" "Encryption skipped via -SkipEncryption flag."
}

# --- Step 4: Copy to off-site network share ---

if (-not $SkipOffsite) {
    Write-Host ""
    Write-Host "--- Step 4: Off-site copy ---" -ForegroundColor Cyan

    if ([string]::IsNullOrWhiteSpace($offsitePath)) {
        Write-Log "WARN" "BACKUP_OFFSITE_PATH not set in .env — skipping off-site copy."
    } else {
        try {
            if (-not (Test-Path $offsitePath)) {
                New-Item -ItemType Directory -Path $offsitePath -Force | Out-Null
            }

            $destFile = Join-Path $offsitePath (Split-Path $finalFile -Leaf)
            Copy-Item $finalFile $destFile -Force

            if (Test-Path $destFile) {
                $destSize = (Get-Item $destFile).Length
                $srcSize = (Get-Item $finalFile).Length
                if ($destSize -eq $srcSize) {
                    Write-Log "OK" "Off-site copy: $destFile"
                } else {
                    Write-Log "WARN" "Off-site copy size mismatch (src=$srcSize, dest=$destSize)."
                }
            } else {
                Write-Log "WARN" "Off-site copy failed — file not found at destination."
            }
        } catch {
            Write-Log "WARN" "Off-site copy failed: $_. Backup remains local only."
        }
    }
} else {
    Write-Host ""
    Write-Host "--- Step 4: Off-site copy (skipped) ---" -ForegroundColor Cyan
}

# --- Step 5: Verify backup ---

Write-Host ""
Write-Host "--- Step 5: Verify ---" -ForegroundColor Cyan

if (Test-Path $finalFile) {
    $fileSize = (Get-Item $finalFile).Length
    if ($fileSize -gt 0) {
        Write-Log "OK" "Backup file verified: $(Split-Path $finalFile -Leaf) ($([math]::Round($fileSize / 1KB, 1)) KB)"
    } else {
        Write-Log "FAIL" "Backup file is empty."
        Write-EventLogEntry "Patient Tracker backup FAILED: backup file is empty."
        exit 1
    }
} else {
    Write-Log "FAIL" "Backup file not found after processing."
    Write-EventLogEntry "Patient Tracker backup FAILED: backup file missing."
    exit 1
}

# --- Step 6: GFS Retention Cleanup ---

Write-Host ""
Write-Host "--- Step 6: Retention cleanup ---" -ForegroundColor Cyan

function Invoke-RetentionCleanup {
    param([string]$Directory)

    if (-not (Test-Path $Directory)) { return }

    $allBackups = Get-ChildItem $Directory -Filter "patient-tracker-*.sql.gz*" |
        Where-Object { $_.Name -match "patient-tracker-(\d{8})-\d{6}" } |
        Sort-Object Name -Descending

    if ($allBackups.Count -eq 0) { return }

    $keep = @{}
    $now = Get-Date

    foreach ($file in $allBackups) {
        if ($file.Name -match "patient-tracker-(\d{4})(\d{2})(\d{2})-") {
            $fileDate = Get-Date -Year $Matches[1] -Month $Matches[2] -Day $Matches[3]
            $age = ($now - $fileDate).Days

            # Daily: keep last N days
            if ($age -le $retainDaily) {
                $keep[$file.FullName] = "daily"
                continue
            }

            # Weekly: keep Sunday backups for last N weeks
            if ($fileDate.DayOfWeek -eq [DayOfWeek]::Sunday -and $age -le ($retainWeekly * 7)) {
                $keep[$file.FullName] = "weekly"
                continue
            }

            # Monthly: keep 1st-of-month backups for last N months
            if ($fileDate.Day -le 1 -and $age -le ($retainMonthly * 31)) {
                $keep[$file.FullName] = "monthly"
                continue
            }
        }
    }

    $removed = 0
    foreach ($file in $allBackups) {
        if (-not $keep.ContainsKey($file.FullName)) {
            Remove-Item $file.FullName -Force -ErrorAction SilentlyContinue
            $removed++
        }
    }

    return $removed
}

$localRemoved = Invoke-RetentionCleanup -Directory $backupDir
Write-Log "OK" "Local retention: removed $localRemoved old backup(s)."

if (-not [string]::IsNullOrWhiteSpace($offsitePath) -and (Test-Path $offsitePath)) {
    try {
        $offsiteRemoved = Invoke-RetentionCleanup -Directory $offsitePath
        Write-Log "OK" "Off-site retention: removed $offsiteRemoved old backup(s)."
    } catch {
        Write-Log "WARN" "Off-site retention cleanup failed: $_"
    }
}

# --- Summary ---

$duration = (Get-Date) - $startTime
$finalSize = [math]::Round((Get-Item $finalFile).Length / 1KB, 1)

Write-Host ""
Write-Host "=== Backup Complete ===" -ForegroundColor Green
Write-Host "  File:     $(Split-Path $finalFile -Leaf)" -ForegroundColor Green
Write-Host "  Size:     $finalSize KB" -ForegroundColor Green
Write-Host "  Duration: $([math]::Round($duration.TotalSeconds, 1))s" -ForegroundColor Green
Write-Host ""

Write-Log "OK" "Backup complete: $(Split-Path $finalFile -Leaf) ($finalSize KB) in $([math]::Round($duration.TotalSeconds, 1))s"

# Write success event
Write-EventLogEntry "Patient Tracker backup succeeded: $(Split-Path $finalFile -Leaf) ($finalSize KB)" -EntryType "Information"
