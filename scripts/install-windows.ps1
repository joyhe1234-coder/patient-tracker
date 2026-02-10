#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Install Patient Tracker on Windows Server.

.DESCRIPTION
    Performs a fresh installation of Patient Tracker using Docker Compose.
    Downloads configuration files, generates secrets, authenticates to GHCR,
    pulls images, and starts the application.

.PARAMETER InstallDir
    Installation directory. Default: C:\patient-tracker

.PARAMETER Branch
    GitHub branch to download files from. Default: main

.PARAMETER SkipPrereqs
    Skip prerequisite checks (use only if you know Docker is configured).

.EXAMPLE
    .\install-windows.ps1
    .\install-windows.ps1 -InstallDir D:\apps\patient-tracker
#>
[CmdletBinding()]
param(
    [string]$InstallDir = "C:\patient-tracker",
    [string]$Branch = "main",
    [switch]$SkipPrereqs
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"  # Speed up Invoke-WebRequest

$GithubOrg = "joyhe1234-coder"
$GithubRepo = "patient-tracker"
$RawBase = "https://raw.githubusercontent.com/$GithubOrg/$GithubRepo/$Branch"

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

function Test-CommandExists {
    param([string]$Command)
    $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

# --- 1. Prerequisite Checks ---

if (-not $SkipPrereqs) {
    Write-Step "Checking prerequisites"

    # Docker installed
    if (-not (Test-CommandExists "docker")) {
        Write-Fail "Docker is not installed or not in PATH."
        Write-Host "  Install Docker Desktop: https://docs.docker.com/desktop/install/windows-install/"
        Write-Host "  Or on Server Core: https://learn.microsoft.com/en-us/virtualization/windowscontainers/quick-start/set-up-environment"
        exit 1
    }
    Write-Ok "Docker found: $(docker --version)"

    # Docker Compose
    $composeVersion = docker compose version 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Docker Compose plugin not found. Ensure Docker Desktop is installed."
        exit 1
    }
    Write-Ok "Docker Compose found: $composeVersion"

    # Docker daemon running
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Docker daemon is not running. Start Docker Desktop and try again."
        exit 1
    }
    Write-Ok "Docker daemon is running"

    # Linux containers mode (check for WSL2 or Hyper-V linux)
    if ($dockerInfo -match "OSType:\s*windows") {
        Write-Fail "Docker is running in Windows containers mode."
        Write-Host "  Switch to Linux containers: right-click Docker Desktop tray icon > 'Switch to Linux containers'"
        exit 1
    }
    Write-Ok "Docker is using Linux containers"

    # Port 80
    $port80 = Get-NetTCPConnection -LocalPort 80 -ErrorAction SilentlyContinue
    if ($port80) {
        $process = Get-Process -Id $port80[0].OwningProcess -ErrorAction SilentlyContinue
        Write-Fail "Port 80 is in use by $($process.ProcessName) (PID $($port80[0].OwningProcess))."
        Write-Host "  If IIS is running: Stop-Service W3SVC -Force"
        Write-Host "  Or change the port in docker-compose.prod.yml after install."
        exit 1
    }
    Write-Ok "Port 80 is available"

    # RAM check (4 GB minimum)
    $totalRamGB = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 1)
    if ($totalRamGB -lt 4) {
        Write-Warn "System has ${totalRamGB}GB RAM. Minimum recommended is 4GB."
    } else {
        Write-Ok "RAM: ${totalRamGB}GB"
    }

    # Disk check (20 GB free minimum)
    $drive = (Split-Path $InstallDir -Qualifier)
    $freeGB = [math]::Round((Get-PSDrive ($drive -replace ':','')).Free / 1GB, 1)
    if ($freeGB -lt 20) {
        Write-Warn "Drive $drive has only ${freeGB}GB free. Minimum recommended is 20GB."
    } else {
        Write-Ok "Disk free: ${freeGB}GB on $drive"
    }
}

# --- 2. Directory Setup ---

Write-Step "Setting up installation directory"

if (Test-Path $InstallDir) {
    Write-Warn "Directory $InstallDir already exists."
    $confirm = Read-Host "Overwrite configuration files? (y/N)"
    if ($confirm -ne 'y') {
        Write-Host "Aborted. Existing installation preserved."
        exit 0
    }
} else {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

# Create subdirectories
foreach ($dir in @("config", "backups", "nginx")) {
    New-Item -ItemType Directory -Path (Join-Path $InstallDir $dir) -Force | Out-Null
}

Write-Ok "Directory created: $InstallDir"

# --- 3. Download Configuration Files ---

Write-Step "Downloading configuration files"

$downloads = @{
    "docker-compose.prod.yml" = "$RawBase/docker-compose.prod.yml"
    "nginx/nginx.prod.conf"   = "$RawBase/nginx/nginx.prod.conf"
    ".env.example"            = "$RawBase/.env.example"
}

foreach ($file in $downloads.GetEnumerator()) {
    $dest = Join-Path $InstallDir $file.Key
    $destDir = Split-Path $dest -Parent
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    try {
        Invoke-WebRequest -Uri $file.Value -OutFile $dest -UseBasicParsing
        Write-Ok "Downloaded $($file.Key)"
    } catch {
        Write-Fail "Failed to download $($file.Key): $_"
        exit 1
    }
}

# Rename compose file for simpler commands
$composeSrc = Join-Path $InstallDir "docker-compose.prod.yml"
$composeDst = Join-Path $InstallDir "docker-compose.yml"
if (Test-Path $composeSrc) {
    Copy-Item $composeSrc $composeDst -Force
    Write-Ok "Copied docker-compose.prod.yml -> docker-compose.yml"
}

# Copy nginx config to expected location
$nginxSrc = Join-Path $InstallDir "nginx/nginx.prod.conf"
$nginxDst = Join-Path $InstallDir "nginx.prod.conf"
if (Test-Path $nginxSrc) {
    Copy-Item $nginxSrc $nginxDst -Force
}

# --- 4. Generate Secrets ---

Write-Step "Generating secrets"

function New-SecureSecret {
    param([int]$Length = 32)
    $bytes = New-Object byte[] $Length
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    return ($bytes | ForEach-Object { $_.ToString("x2") }) -join ''
}

$dbPassword = New-SecureSecret 24
$jwtSecret = New-SecureSecret 32

Write-Ok "Generated DB_PASSWORD (48 hex chars)"
Write-Ok "Generated JWT_SECRET (64 hex chars)"

# --- 5. Prompt for Configuration ---

Write-Step "Configuration"

$adminEmail = Read-Host "Admin email address (default: admin@clinic.com)"
if ([string]::IsNullOrWhiteSpace($adminEmail)) { $adminEmail = "admin@clinic.com" }

$appUrl = Read-Host "Application URL (default: http://localhost)"
if ([string]::IsNullOrWhiteSpace($appUrl)) { $appUrl = "http://localhost" }

# --- 6. Create .env File ---

Write-Step "Creating .env file"

$envContent = @"
# Patient Tracker - Generated by install-windows.ps1
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

# Container registry (GHCR)
DOCKER_REGISTRY=ghcr.io/$GithubOrg
VERSION=latest

# Database
DB_PASSWORD=$dbPassword

# Authentication
JWT_SECRET=$jwtSecret
JWT_EXPIRES_IN=8h

# Application
NODE_ENV=production
APP_URL=$appUrl

# Initial admin account (used on first startup only)
ADMIN_EMAIL=$adminEmail
ADMIN_PASSWORD=changeme123

# SMTP for password reset emails (optional)
# SMTP_HOST=mail.yourcompany.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=noreply@yourcompany.com
# SMTP_PASS=your_email_password
# SMTP_FROM=Patient Tracker <noreply@yourcompany.com>
"@

$envPath = Join-Path $InstallDir ".env"
$envContent | Out-File -FilePath $envPath -Encoding utf8NoBOM

# Restrict .env file permissions to Administrators and SYSTEM only
$acl = New-Object System.Security.AccessControl.FileSecurity
$acl.SetAccessRuleProtection($true, $false)  # Disable inheritance
$adminRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
    "BUILTIN\Administrators", "FullControl", "Allow")
$systemRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
    "NT AUTHORITY\SYSTEM", "FullControl", "Allow")
$acl.AddAccessRule($adminRule)
$acl.AddAccessRule($systemRule)
Set-Acl -Path $envPath -AclObject $acl

Write-Ok "Created .env with restricted permissions (Administrators + SYSTEM only)"

# --- 7. GHCR Authentication ---

Write-Step "Container registry authentication"

Write-Host ""
Write-Host "  To pull images from GHCR, you need a GitHub Personal Access Token (PAT)" -ForegroundColor Yellow
Write-Host "  with the 'read:packages' scope."
Write-Host ""
Write-Host "  Create one at: https://github.com/settings/tokens/new?scopes=read:packages"
Write-Host ""

$ghcrToken = Read-Host "Enter your GitHub PAT (or press Enter to skip if repo is public)"

if (-not [string]::IsNullOrWhiteSpace($ghcrToken)) {
    $ghcrUser = Read-Host "Enter your GitHub username"
    $ghcrToken | docker login ghcr.io -u $ghcrUser --password-stdin 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Ok "Authenticated to ghcr.io"
    } else {
        Write-Warn "GHCR login failed. You can retry later with: docker login ghcr.io"
    }
} else {
    Write-Warn "Skipped GHCR auth. If images are private, run: docker login ghcr.io"
}

# --- 8. Pull and Start ---

Write-Step "Pulling and starting containers"

Push-Location $InstallDir
try {
    Write-Host "  Pulling images (this may take a few minutes on first run)..."
    docker compose pull 2>&1 | ForEach-Object { Write-Host "  $_" }
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Failed to pull images. Check GHCR authentication and network."
        Write-Host "  Re-authenticate: docker login ghcr.io"
        exit 1
    }
    Write-Ok "Images pulled successfully"

    Write-Host "  Starting containers..."
    docker compose up -d 2>&1 | ForEach-Object { Write-Host "  $_" }
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Failed to start containers."
        Write-Host "  Check logs: docker compose -f $(Join-Path $InstallDir 'docker-compose.yml') logs"
        exit 1
    }
    Write-Ok "Containers started"
} finally {
    Pop-Location
}

# --- 9. Health Check ---

Write-Step "Waiting for application to become healthy"

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
        # Expected while containers are starting
    }

    Write-Host "  Waiting... ($elapsed/$timeout seconds)" -NoNewline
    Write-Host "`r" -NoNewline
    Start-Sleep -Seconds $interval
    $elapsed += $interval
}

Write-Host ""

if ($healthy) {
    Write-Ok "Application is healthy!"
} else {
    Write-Warn "Health check timed out after ${timeout}s."
    Write-Host "  The app may still be starting. Check with:"
    Write-Host "    docker compose -f $(Join-Path $InstallDir 'docker-compose.yml') logs -f"
    Write-Host "    Invoke-WebRequest $healthUrl"
}

# --- 10. Summary ---

Write-Step "Installation Complete"

Write-Host ""
Write-Host "  Application URL:  $appUrl" -ForegroundColor Green
Write-Host "  Admin Email:      $adminEmail" -ForegroundColor Green
Write-Host "  Admin Password:   changeme123" -ForegroundColor Yellow
Write-Host "  Install Directory: $InstallDir" -ForegroundColor Green
Write-Host ""
Write-Host "  IMPORTANT: Change the admin password immediately after first login!" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Useful commands:" -ForegroundColor Cyan
Write-Host "    View logs:      docker compose -f $(Join-Path $InstallDir 'docker-compose.yml') logs -f"
Write-Host "    Stop app:       docker compose -f $(Join-Path $InstallDir 'docker-compose.yml') down"
Write-Host "    Start app:      docker compose -f $(Join-Path $InstallDir 'docker-compose.yml') up -d"
Write-Host "    Update:         .\scripts\update.ps1 -InstallDir $InstallDir"
Write-Host "    Validate:       .\scripts\validate-deployment.ps1 -InstallDir $InstallDir"
Write-Host ""
