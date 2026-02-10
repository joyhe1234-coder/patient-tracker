<#
.SYNOPSIS
    Validate a Patient Tracker deployment.

.DESCRIPTION
    Runs 6 health checks against a running Patient Tracker installation
    and outputs a GO/NO-GO verdict.

.PARAMETER InstallDir
    Installation directory. Default: C:\patient-tracker

.EXAMPLE
    .\validate-deployment.ps1
    .\validate-deployment.ps1 -InstallDir D:\apps\patient-tracker
#>
[CmdletBinding()]
param(
    [string]$InstallDir = "C:\patient-tracker"
)

$ErrorActionPreference = "Continue"

# --- Helpers ---

$script:PassCount = 0
$script:WarnCount = 0
$script:FailCount = 0

function Write-Check {
    param(
        [string]$Name,
        [string]$Status,   # PASS, WARN, FAIL
        [string]$Detail
    )

    $color = switch ($Status) {
        "PASS" { "Green" }
        "WARN" { "Yellow" }
        "FAIL" { "Red" }
    }

    switch ($Status) {
        "PASS" { $script:PassCount++ }
        "WARN" { $script:WarnCount++ }
        "FAIL" { $script:FailCount++ }
    }

    $padded = $Name.PadRight(35)
    Write-Host "  [$Status] $padded $Detail" -ForegroundColor $color
}

# --- Validate Install ---

$composePath = Join-Path $InstallDir "docker-compose.yml"
if (-not (Test-Path $composePath)) {
    Write-Host "ERROR: docker-compose.yml not found in $InstallDir" -ForegroundColor Red
    exit 1
}

# Read APP_URL from .env
$appUrl = "http://localhost"
$envPath = Join-Path $InstallDir ".env"
if (Test-Path $envPath) {
    foreach ($line in (Get-Content $envPath)) {
        if ($line -match "^APP_URL=(.+)$") {
            $appUrl = $Matches[1]
        }
    }
}

Write-Host ""
Write-Host "=== Patient Tracker Deployment Validation ===" -ForegroundColor Cyan
Write-Host "  Install: $InstallDir"
Write-Host "  URL:     $appUrl"
Write-Host ""

# --- Check 1: All Containers Running ---

Push-Location $InstallDir
try {
    $containers = docker compose ps --format json 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Check "Containers running" "FAIL" "docker compose ps failed"
    } else {
        $parsed = $containers | ConvertFrom-Json
        if ($parsed -is [array]) {
            $allServices = $parsed
        } else {
            $allServices = @($parsed)
        }

        $expected = @("nginx", "web", "app", "db")
        $running = @()
        $notRunning = @()

        foreach ($svc in $expected) {
            $found = $allServices | Where-Object { $_.Service -eq $svc -and $_.State -eq "running" }
            if ($found) {
                $running += $svc
            } else {
                $notRunning += $svc
            }
        }

        if ($notRunning.Count -eq 0) {
            Write-Check "Containers running" "PASS" "All 4 services running ($($running -join ', '))"
        } else {
            Write-Check "Containers running" "FAIL" "Not running: $($notRunning -join ', ')"
        }
    }
} finally {
    Pop-Location
}

# --- Check 2: Database Healthy ---

Push-Location $InstallDir
try {
    $dbHealth = docker compose exec -T db pg_isready -U appuser -d patienttracker 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Check "Database healthy" "PASS" "PostgreSQL accepting connections"
    } else {
        Write-Check "Database healthy" "FAIL" "pg_isready failed: $dbHealth"
    }
} finally {
    Pop-Location
}

# --- Check 3: API Health Endpoint ---

try {
    $healthUrl = "$appUrl/api/health"
    if ($appUrl -eq "http://localhost") {
        $healthUrl = "http://localhost/api/health"
    }

    $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Check "API /health responds" "PASS" "HTTP 200"
    } else {
        Write-Check "API /health responds" "WARN" "HTTP $($response.StatusCode)"
    }
} catch {
    Write-Check "API /health responds" "FAIL" "$($_.Exception.Message)"
}

# --- Check 4: Frontend Loads ---

try {
    $frontendUrl = $appUrl
    $response = Invoke-WebRequest -Uri $frontendUrl -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Check "Frontend loads" "PASS" "HTTP 200 ($($response.Content.Length) bytes)"
    } else {
        Write-Check "Frontend loads" "WARN" "HTTP $($response.StatusCode)"
    }
} catch {
    Write-Check "Frontend loads" "FAIL" "$($_.Exception.Message)"
}

# --- Check 5: Socket.io Reachable ---

try {
    $socketUrl = "$appUrl/socket.io/?EIO=4&transport=polling"
    $response = Invoke-WebRequest -Uri $socketUrl -UseBasicParsing -TimeoutSec 10 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Check "Socket.io reachable" "PASS" "HTTP 200"
    } else {
        Write-Check "Socket.io reachable" "WARN" "HTTP $($response.StatusCode)"
    }
} catch {
    # Socket.io may return 400 if not configured, that's OK
    if ($_.Exception.Response.StatusCode.value__ -eq 400) {
        Write-Check "Socket.io reachable" "WARN" "HTTP 400 (endpoint exists but connection not established)"
    } else {
        Write-Check "Socket.io reachable" "WARN" "Not reachable (may not be configured)"
    }
}

# --- Check 6: Disk Space ---

$drive = Split-Path $InstallDir -Qualifier
$freeGB = [math]::Round((Get-PSDrive ($drive -replace ':','')).Free / 1GB, 1)
if ($freeGB -gt 5) {
    Write-Check "Disk space" "PASS" "${freeGB}GB free on $drive"
} elseif ($freeGB -gt 2) {
    Write-Check "Disk space" "WARN" "${freeGB}GB free on $drive (low)"
} else {
    Write-Check "Disk space" "FAIL" "${freeGB}GB free on $drive (critical)"
}

# --- Verdict ---

Write-Host ""
Write-Host "  ----------------------------------------" -ForegroundColor Gray
Write-Host "  Results: $($script:PassCount) PASS, $($script:WarnCount) WARN, $($script:FailCount) FAIL"

if ($script:FailCount -eq 0 -and $script:WarnCount -eq 0) {
    Write-Host ""
    Write-Host "  VERDICT: GO" -ForegroundColor Green
    Write-Host "  All checks passed. Deployment is healthy." -ForegroundColor Green
} elseif ($script:FailCount -eq 0) {
    Write-Host ""
    Write-Host "  VERDICT: GO (with warnings)" -ForegroundColor Yellow
    Write-Host "  No critical failures, but review warnings above." -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "  VERDICT: NO-GO" -ForegroundColor Red
    Write-Host "  $($script:FailCount) critical check(s) failed. Review and fix before use." -ForegroundColor Red
}

Write-Host ""
