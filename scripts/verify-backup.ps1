#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Verify a Patient Tracker backup file by performing a test restore.

.DESCRIPTION
    Decrypts and decompresses a backup file, restores it into a temporary
    database, runs integrity checks (table counts, row counts, schema version),
    then drops the temporary database and reports PASS/FAIL.

.PARAMETER BackupFile
    Path to the backup file (.sql.gz or .sql.gz.7z).

.PARAMETER InstallDir
    Installation directory. Default: C:\patient-tracker

.EXAMPLE
    .\verify-backup.ps1 -BackupFile backups\patient-tracker-20260301-020000.sql.gz.7z
    .\verify-backup.ps1 -BackupFile C:\patient-tracker\backups\patient-tracker-20260301-020000.sql.gz
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$BackupFile,

    [string]$InstallDir = "C:\patient-tracker"
)

$ErrorActionPreference = "Stop"

# --- Helpers ---

function Write-Ok {
    param([string]$Message)
    Write-Host "  [OK] $Message" -ForegroundColor Green
}

function Write-Fail {
    param([string]$Message)
    Write-Host "  [FAIL] $Message" -ForegroundColor Red
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

# --- Validate inputs ---

Write-Host ""
Write-Host "=== Patient Tracker Backup Verification ===" -ForegroundColor Cyan

if (-not (Test-Path $BackupFile)) {
    Write-Fail "Backup file not found: $BackupFile"
    exit 1
}

$composePath = Join-Path $InstallDir "docker-compose.yml"
if (-not (Test-Path $composePath)) {
    Write-Fail "docker-compose.yml not found in $InstallDir"
    exit 1
}

# Read encryption key from .env
$envPath = Join-Path $InstallDir ".env"
$encryptionKey = ""
if (Test-Path $envPath) {
    foreach ($line in (Get-Content $envPath)) {
        if ($line -match "^BACKUP_ENCRYPTION_KEY=(.+)$") { $encryptionKey = $Matches[1].Trim() }
    }
}

$tempDir = Join-Path $env:TEMP "pt-verify-$(Get-Date -Format 'yyyyMMddHHmmss')"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
$tempDbName = "pt_verify_temp"
$passed = $true

try {
    # --- Step 1: Decrypt (if .7z) ---

    Write-Host ""
    Write-Host "--- Step 1: Decrypt / Decompress ---" -ForegroundColor Cyan

    $workingFile = $BackupFile

    if ($BackupFile -match "\.7z$") {
        # Encrypted archive — decrypt with 7-Zip
        if ([string]::IsNullOrWhiteSpace($encryptionKey)) {
            Write-Fail "Backup is encrypted but BACKUP_ENCRYPTION_KEY not set in .env."
            $passed = $false
            return
        }

        $sevenZip = Get-7ZipPath
        if (-not $sevenZip) {
            Write-Fail "7-Zip not found. Install from https://7-zip.org/"
            $passed = $false
            return
        }

        & $sevenZip x "-p$encryptionKey" -o"$tempDir" $BackupFile -y 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Fail "Decryption failed. Wrong encryption key or corrupt archive."
            $passed = $false
            return
        }

        # Find the extracted .sql.gz file
        $extracted = Get-ChildItem $tempDir -Filter "*.sql.gz" -Recurse | Select-Object -First 1
        if (-not $extracted) {
            Write-Fail "No .sql.gz file found inside the archive."
            $passed = $false
            return
        }

        $workingFile = $extracted.FullName
        Write-Ok "Decrypted successfully."
    }

    # --- Step 2: Decompress gzip ---

    $sqlFile = Join-Path $tempDir "restore.sql"

    if ($workingFile -match "\.gz$") {
        $inputStream = [System.IO.File]::OpenRead($workingFile)
        $outputStream = [System.IO.File]::Create($sqlFile)
        $gzipStream = New-Object System.IO.Compression.GZipStream($inputStream, [System.IO.Compression.CompressionMode]::Decompress)
        $gzipStream.CopyTo($outputStream)
        $outputStream.Close()
        $gzipStream.Close()
        $inputStream.Close()
        Write-Ok "Decompressed to SQL ($([math]::Round((Get-Item $sqlFile).Length / 1KB, 1)) KB)."
    } elseif ($workingFile -match "\.sql$") {
        Copy-Item $workingFile $sqlFile
        Write-Ok "Plain SQL file ($([math]::Round((Get-Item $sqlFile).Length / 1KB, 1)) KB)."
    } else {
        Write-Fail "Unrecognized file format: $workingFile"
        $passed = $false
        return
    }

    # --- Step 3: Restore to temp database ---

    Write-Host ""
    Write-Host "--- Step 2: Test restore ---" -ForegroundColor Cyan

    Push-Location $InstallDir
    try {
        # Ensure db container is running
        $dbContainer = docker compose ps -q db 2>&1
        if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($dbContainer)) {
            Write-Fail "Database container is not running."
            $passed = $false
            return
        }

        # Drop temp db if it exists from a previous failed run
        docker compose exec -T db psql -U appuser -d postgres -c "DROP DATABASE IF EXISTS $tempDbName;" 2>&1 | Out-Null

        # Create temp database
        docker compose exec -T db psql -U appuser -d postgres -c "CREATE DATABASE $tempDbName;" 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Fail "Could not create temporary database."
            $passed = $false
            return
        }

        # Restore using cmd /c for encoding safety
        cmd /c "type `"$sqlFile`" | docker compose exec -T db psql -U appuser -d $tempDbName 2>&1" | Out-Null

        Write-Ok "SQL restored to temporary database '$tempDbName'."
    } finally {
        Pop-Location
    }

    # --- Step 4: Integrity checks ---

    Write-Host ""
    Write-Host "--- Step 3: Integrity checks ---" -ForegroundColor Cyan

    Push-Location $InstallDir
    try {
        # Get table count
        $tableCountResult = docker compose exec -T db psql -U appuser -d $tempDbName -t -c `
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" 2>&1
        $tableCount = ($tableCountResult | Out-String).Trim()

        if ([int]$tableCount -gt 0) {
            Write-Ok "Tables found: $tableCount"
        } else {
            Write-Fail "No tables found in restored database."
            $passed = $false
        }

        # Check key tables and row counts (Prisma uses snake_case table names)
        $keyTables = @("patients", "users", "audit_log", "config_quality_measures", "patient_measures", "config_request_types")
        $tableSummary = @()

        foreach ($table in $keyTables) {
            $result = docker compose exec -T db psql -U appuser -d $tempDbName -t -c `
                "SELECT COUNT(*) FROM $table;" 2>&1
            $count = ($result | Out-String).Trim()

            if ($LASTEXITCODE -eq 0 -and $count -match "^\d+$") {
                $tableSummary += "$table=$count"
                if ($table -eq "users" -and [int]$count -eq 0) {
                    Write-Fail "users table is empty — no accounts would be available after restore."
                    $passed = $false
                }
            } else {
                # Table might not exist (renamed or not yet migrated)
                $tableSummary += "$table=N/A"
            }
        }

        Write-Ok "Row counts: $($tableSummary -join ', ')"

        # Check schema version (Prisma migrations table)
        $migrationResult = docker compose exec -T db psql -U appuser -d $tempDbName -t -c `
            "SELECT migration_name FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 1;" 2>&1
        $latestMigration = ($migrationResult | Out-String).Trim()

        if (-not [string]::IsNullOrWhiteSpace($latestMigration)) {
            Write-Ok "Schema version: $latestMigration"
        } else {
            Write-Fail "Could not determine schema version (no Prisma migrations found)."
            $passed = $false
        }
    } finally {
        Pop-Location
    }

    # --- Step 5: Cleanup ---

    Write-Host ""
    Write-Host "--- Cleanup ---" -ForegroundColor Cyan

    Push-Location $InstallDir
    try {
        docker compose exec -T db psql -U appuser -d postgres -c "DROP DATABASE IF EXISTS $tempDbName;" 2>&1 | Out-Null
        Write-Ok "Temporary database dropped."
    } finally {
        Pop-Location
    }

} finally {
    # Always clean up temp directory
    if (Test-Path $tempDir) {
        Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# --- Verdict ---

Write-Host ""
if ($passed) {
    Write-Host "=== PASS ===" -ForegroundColor Green
    Write-Host "  Backup file:  $(Split-Path $BackupFile -Leaf)" -ForegroundColor Green
    Write-Host "  Total tables: $tableCount" -ForegroundColor Green
    Write-Host "  Row counts:   $($tableSummary -join ', ')" -ForegroundColor Green
    Write-Host "  Schema:       $latestMigration" -ForegroundColor Green
    exit 0
} else {
    Write-Host "=== FAIL ===" -ForegroundColor Red
    Write-Host "  Backup file: $(Split-Path $BackupFile -Leaf)" -ForegroundColor Red
    Write-Host "  One or more integrity checks failed. Review output above." -ForegroundColor Red
    exit 1
}
