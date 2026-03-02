# Patient Tracker - Windows Server Deployment Guide

This guide covers deploying Patient Tracker on-premise on Windows Server behind your organization's VPN. Designed for IT staff who manage the server.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installing Docker](#installing-docker)
3. [Initial Deployment](#initial-deployment)
4. [Verifying Installation](#verifying-installation)
5. [Updating to a New Version](#updating-to-a-new-version)
6. [Backup & Restore](#backup--restore)
7. [Rollback Procedure](#rollback-procedure)
8. [SSL/TLS Configuration](#ssltls-configuration)
9. [Offline / Air-Gapped Deployment](#offline--air-gapped-deployment)
10. [Troubleshooting](#troubleshooting)
11. [Architecture Diagram](#architecture-diagram)

---

## Prerequisites

### Windows Server Version

| Requirement | Minimum |
|-------------|---------|
| OS | Windows Server 2019 or later (with Desktop Experience or Server Core) |
| Feature | Hyper-V enabled (for Docker) |
| Alternative | WSL2 (Windows Server 2022+) |

### Hardware

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 cores | 4 cores |
| RAM | 4 GB | 8 GB |
| Disk | 20 GB SSD | 50 GB SSD |

### Network

| Port | Purpose | Notes |
|------|---------|-------|
| 80 | HTTP | Application (or your chosen port) |
| 443 | HTTPS | If using SSL termination |
| Outbound HTTPS | GHCR image pulls | `ghcr.io` on port 443 |

### Software

- **Docker Desktop** (recommended for servers with Desktop Experience) or **Docker Engine** (Server Core)
- **PowerShell 5.1+** (included with Windows Server)
- **Git** (optional, for cloning scripts)

---

## Installing Docker

### Option A: Docker Desktop (Desktop Experience)

1. Download Docker Desktop from https://docs.docker.com/desktop/install/windows-install/
2. Run the installer. Enable WSL2 backend when prompted.
3. Restart the server when prompted.
4. After restart, open Docker Desktop and wait for it to initialize.
5. **Switch to Linux containers** if not already:
   - Right-click the Docker icon in the system tray
   - Select "Switch to Linux containers..."

Verify installation:

```powershell
docker --version
docker compose version
docker run hello-world
```

### Option B: Docker Engine on Server Core

For headless Server Core installations:

```powershell
# Enable Hyper-V and Containers features
Install-WindowsFeature -Name Hyper-V, Containers -IncludeManagementTools -Restart

# After restart, install Docker via script
Invoke-WebRequest -Uri "https://get.docker.com" -OutFile "$env:TEMP\install-docker.sh"
# Follow Docker's Windows Server Core installation guide:
# https://learn.microsoft.com/en-us/virtualization/windowscontainers/quick-start/set-up-environment
```

### Configure WSL2 Memory (Recommended)

Docker Desktop on Windows uses WSL2, which by default may consume too much memory. Create or edit `%USERPROFILE%\.wslconfig`:

```ini
[wsl2]
memory=4GB
processors=2
swap=2GB
```

Then restart WSL:

```powershell
wsl --shutdown
# Restart Docker Desktop
```

---

## Initial Deployment

### Automated Installation

The install script handles everything: prerequisite checks, file downloads, secret generation, container startup, and health verification.

```powershell
# 1. Download the install script
Invoke-WebRequest `
  -Uri "https://raw.githubusercontent.com/joyhe1234-coder/patient-tracker/main/scripts/install-windows.ps1" `
  -OutFile "$env:TEMP\install-windows.ps1"

# 2. Run as Administrator
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
& "$env:TEMP\install-windows.ps1"
```

The script will:
- Check Docker is installed and running in Linux containers mode
- Check port 80, RAM, and disk space
- Create `C:\patient-tracker` with all configuration files
- Generate secure `DB_PASSWORD` and `JWT_SECRET`
- Prompt for admin email and application URL
- Create `.env` with restricted file permissions (Administrators + SYSTEM only)
- Optionally authenticate to GHCR (needed for private repositories)
- Pull Docker images and start all containers
- Wait for the health check to pass

### Manual Installation

If you prefer to install manually:

```powershell
# 1. Create installation directory
New-Item -ItemType Directory -Path C:\patient-tracker -Force
Set-Location C:\patient-tracker

# 2. Download required files
$base = "https://raw.githubusercontent.com/joyhe1234-coder/patient-tracker/main"
Invoke-WebRequest "$base/docker-compose.prod.yml" -OutFile docker-compose.yml
Invoke-WebRequest "$base/nginx/nginx.prod.conf" -OutFile nginx.prod.conf
Invoke-WebRequest "$base/.env.example" -OutFile .env.example

# 3. Create directories
New-Item -ItemType Directory -Path config, backups, nginx -Force

# 4. Create .env from example
Copy-Item .env.example .env

# 5. Edit .env - set these values:
#    DB_PASSWORD=<generate with: [System.Guid]::NewGuid().ToString("N")>
#    JWT_SECRET=<generate with: -join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) })>
#    ADMIN_EMAIL=admin@yourcompany.com
#    APP_URL=http://your-server-name

# 6. Authenticate to GHCR (if images are private)
docker login ghcr.io

# 7. Pull and start
docker compose pull
docker compose up -d

# 8. Verify
Invoke-WebRequest http://localhost/api/health
```

### After Installation

1. Open your browser and navigate to the application URL
2. Log in with the admin email and default password (`changeme123`)
3. **Change the admin password immediately**
4. Create user accounts for physicians and staff

---

## Verifying Installation

Run the validation script to check all components:

```powershell
# Download (if not already present)
Invoke-WebRequest `
  -Uri "https://raw.githubusercontent.com/joyhe1234-coder/patient-tracker/main/scripts/validate-deployment.ps1" `
  -OutFile C:\patient-tracker\validate-deployment.ps1

# Run
.\validate-deployment.ps1 -InstallDir C:\patient-tracker
```

The script checks:

| Check | What It Verifies |
|-------|------------------|
| Containers running | All 4 services (nginx, web, app, db) are running |
| Database healthy | PostgreSQL accepts connections |
| API /health | Backend responds HTTP 200 |
| Frontend loads | Frontend HTML loads successfully |
| Socket.io | Real-time endpoint is reachable |
| Disk space | More than 5 GB free on the installation drive |

Output is a **GO / NO-GO** verdict.

---

## Updating to a New Version

When a developer pushes a new version tag (e.g., `v1.3.0`), GitHub Actions automatically builds and publishes new Docker images. To apply the update:

### Using the Update Script

```powershell
# Download latest update script
Invoke-WebRequest `
  -Uri "https://raw.githubusercontent.com/joyhe1234-coder/patient-tracker/main/scripts/update.ps1" `
  -OutFile C:\patient-tracker\update.ps1

# Update to a specific version
.\update.ps1 -Version 1.3.0

# Or update to latest
.\update.ps1 -Version latest
```

The update script will:
1. Show current vs target version
2. Back up the database (unless `-SkipBackup` is used)
3. Pull new Docker images (aborts if pull fails — old containers keep running)
4. Update VERSION in `.env`
5. Restart containers (database migrations run automatically)
6. Wait for health check
7. If health check fails, display the rollback command

### Manual Update

```powershell
Set-Location C:\patient-tracker

# 1. Backup database
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
cmd /c "docker compose exec -T db pg_dump -U appuser -d patienttracker > backups\patient-tracker-$timestamp.sql"

# 2. Update version in .env
(Get-Content .env) -replace 'VERSION=.*', 'VERSION=1.3.0' | Set-Content .env

# 3. Pull new images
docker compose pull

# 4. Restart
docker compose up -d

# 5. Verify
.\validate-deployment.ps1
```

---

## Backup & Restore

Patient Tracker includes an automated backup system with encryption, off-site copy to a network share (NAS), and GFS (Grandfather-Father-Son) retention. See [`DISASTER_RECOVERY.md`](DISASTER_RECOVERY.md) for full disaster recovery procedures.

### Automated Daily Backups

The `install-windows.ps1` script automatically creates a Windows Task Scheduler task that runs `scripts\backup.ps1` daily at 2:00 AM. The backup script:

1. Dumps the PostgreSQL database
2. Compresses with gzip
3. Encrypts with AES-256 via 7-Zip (requires [7-Zip](https://7-zip.org/) installed)
4. Copies the encrypted backup to the off-site network share
5. Applies GFS retention (7 daily, 4 weekly, 12 monthly)
6. Logs the result to `backups\backup.log`
7. Writes a Windows Event Log entry on failure

### Configuration

Backup settings are stored in `.env`:

```env
# Generated automatically during install
BACKUP_ENCRYPTION_KEY=<32-char-hex-key>

# Network share for off-site copies (UNC path)
BACKUP_OFFSITE_PATH=\\nas\backups\patient-tracker

# GFS retention policy
BACKUP_RETENTION_DAILY=7
BACKUP_RETENTION_WEEKLY=4
BACKUP_RETENTION_MONTHLY=12
```

> **IMPORTANT:** Store a copy of `BACKUP_ENCRYPTION_KEY` in a secure location off-server (e.g., password manager, sealed envelope in a safe). Without this key, encrypted backups cannot be restored.

### Manual Backup

```powershell
# Run the backup script manually
cd C:\patient-tracker
.\scripts\backup.ps1
```

### Verify a Backup

Test that a backup file is valid and can be restored:

```powershell
.\scripts\verify-backup.ps1 -BackupFile backups\patient-tracker-20260301-020000.sql.gz.7z
# Output: PASS — 8 tables verified, 1247 patients, 3 users, schema v20260205070000
```

Run this weekly or after any backup configuration change.

### Restore from Backup

Use the rollback script. For encrypted backups, decrypt first:

```powershell
cd C:\patient-tracker

# 1. Decrypt the backup (if .7z encrypted)
& "C:\Program Files\7-Zip\7z.exe" x -p"YOUR_ENCRYPTION_KEY" backups\patient-tracker-20260301-020000.sql.gz.7z -obackups\
& "C:\Program Files\7-Zip\7z.exe" x backups\patient-tracker-20260301-020000.sql.gz -obackups\

# 2. Restore
.\scripts\rollback.ps1 -Version latest -BackupFile backups\patient-tracker-20260301-020000.sql
```

### Off-Site Backup Setup

To add or change the off-site network share after installation:

1. Edit `C:\patient-tracker\.env`
2. Set `BACKUP_OFFSITE_PATH` to your NAS UNC path (e.g., `\\nas\backups\patient-tracker`)
3. Ensure the SYSTEM account has write access to the share
4. Run `.\scripts\backup.ps1` to test

### Quarterly Restore Test

See [`DISASTER_RECOVERY.md`](DISASTER_RECOVERY.md) for a step-by-step quarterly restore test checklist to verify your backups are working.

---

## Rollback Procedure

If an update causes problems, roll back to the previous version:

```powershell
# Rollback to version 1.2.0 with database restore
.\rollback.ps1 -Version 1.2.0 -BackupFile C:\patient-tracker\backups\patient-tracker-20260209-120000.sql

# Rollback images only (keep current database)
.\rollback.ps1 -Version 1.2.0 -SkipDbRestore
```

The rollback script will:
1. Warn if the backup file is older than 24 hours
2. Stop application containers (database stays running)
3. Restore database from backup (if provided)
4. Pull the specified version images
5. Restart all containers
6. Run health check

---

## SSL/TLS Configuration

### Option 1: Self-Signed Certificate (Internal VPN)

For internal use behind a VPN, a self-signed certificate is acceptable:

```powershell
# Generate self-signed cert
$cert = New-SelfSignedCertificate `
  -DnsName "patient-tracker.yourcompany.local" `
  -CertStoreLocation "Cert:\LocalMachine\My" `
  -NotAfter (Get-Date).AddYears(5)

# Export to PFX
$password = ConvertTo-SecureString -String "certpassword" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath C:\patient-tracker\nginx\server.pfx -Password $password

# Convert to PEM for Nginx
openssl pkcs12 -in C:\patient-tracker\nginx\server.pfx -out C:\patient-tracker\nginx\server.crt -clcerts -nokeys -passin pass:certpassword
openssl pkcs12 -in C:\patient-tracker\nginx\server.pfx -out C:\patient-tracker\nginx\server.key -nocerts -nodes -passin pass:certpassword
```

Then update the Nginx config to use SSL. Create `C:\patient-tracker\nginx.prod.conf` with SSL configuration:

```nginx
server {
    listen 80;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    ssl_certificate /etc/nginx/server.crt;
    ssl_certificate_key /etc/nginx/server.key;
    ssl_protocols TLSv1.2 TLSv1.3;

    # ... rest of existing config
}
```

Mount the certificate files in `docker-compose.yml`:

```yaml
nginx:
  volumes:
    - ./nginx.prod.conf:/etc/nginx/nginx.conf:ro
    - ./nginx/server.crt:/etc/nginx/server.crt:ro
    - ./nginx/server.key:/etc/nginx/server.key:ro
  ports:
    - "80:80"
    - "443:443"
```

### Option 2: Corporate CA Certificate

If your organization has an internal Certificate Authority:

1. Request a certificate for your server hostname from your CA
2. Place the `.crt` and `.key` files in `C:\patient-tracker\nginx\`
3. Configure Nginx as shown above
4. Distribute the CA root certificate to client machines via Group Policy

---

## Offline / Air-Gapped Deployment

For environments without internet access, use Docker image export/import.

### On a Machine with Internet Access

```powershell
# Pull the images
docker pull ghcr.io/joyhe1234-coder/patient-tracker-frontend:1.3.0
docker pull ghcr.io/joyhe1234-coder/patient-tracker-backend:1.3.0
docker pull nginx:alpine
docker pull postgres:16-alpine

# Save to tar files
docker save `
  ghcr.io/joyhe1234-coder/patient-tracker-frontend:1.3.0 `
  ghcr.io/joyhe1234-coder/patient-tracker-backend:1.3.0 `
  nginx:alpine `
  postgres:16-alpine `
  -o patient-tracker-images-1.3.0.tar

# Copy to USB drive / network share
```

### On the Air-Gapped Server

```powershell
# Load images from tar
docker load -i patient-tracker-images-1.3.0.tar

# Update .env with correct version
(Get-Content C:\patient-tracker\.env) -replace 'VERSION=.*', 'VERSION=1.3.0' | Set-Content C:\patient-tracker\.env

# Start (no pull needed)
Set-Location C:\patient-tracker
docker compose up -d
```

---

## Troubleshooting

### IIS Port 80 Conflict

IIS (Internet Information Services) is often running on Windows Server and occupies port 80.

```powershell
# Check what's using port 80
Get-NetTCPConnection -LocalPort 80 | Select-Object OwningProcess
Get-Process -Id (Get-NetTCPConnection -LocalPort 80).OwningProcess

# Stop IIS
Stop-Service W3SVC -Force

# Prevent IIS from starting on boot
Set-Service W3SVC -StartupType Disabled

# Or change Patient Tracker to use a different port:
# Edit docker-compose.yml, change "80:80" to "8080:80"
# Update APP_URL in .env to http://your-server:8080
```

### Docker Memory Limits

If containers are being killed (OOM) or Docker is slow:

1. Edit `%USERPROFILE%\.wslconfig`:
   ```ini
   [wsl2]
   memory=4GB
   swap=2GB
   ```
2. Restart WSL: `wsl --shutdown`
3. Restart Docker Desktop

### Windows Defender Slowing Docker

Windows Defender real-time scanning can significantly slow Docker I/O.

```powershell
# Add exclusions for Docker and Patient Tracker
Add-MpPreference -ExclusionPath "C:\patient-tracker"
Add-MpPreference -ExclusionPath "C:\ProgramData\Docker"
Add-MpPreference -ExclusionPath "$env:LOCALAPPDATA\Docker"
Add-MpPreference -ExclusionProcess "com.docker.backend.exe"
Add-MpPreference -ExclusionProcess "dockerd.exe"
```

### GHCR Token Expired

If `docker compose pull` fails with a 401 error:

```powershell
# Check current auth
docker login ghcr.io

# Re-authenticate with a new token
# Create token at: https://github.com/settings/tokens/new?scopes=read:packages
echo YOUR_NEW_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

### Volume Permissions

If the backend cannot write to the config directory:

```powershell
# Check container user
docker compose exec app whoami
# Expected: nodejs

# Fix permissions inside the container
docker compose exec -u root app chown -R nodejs:nodejs /app/config
```

### Containers Restart-Looping

If a container keeps restarting (usually after a failed migration):

```powershell
# Check logs
docker compose logs app --tail 50

# Common causes:
# - DATABASE_URL incorrect in .env
# - Migration failed (schema conflict)
# - Database not ready yet (check db container first)

# Reset database if needed (DESTROYS ALL DATA)
docker compose down
docker volume rm patient-tracker_postgres_data
docker compose up -d
```

### View All Logs

```powershell
Set-Location C:\patient-tracker

# All containers
docker compose logs -f

# Specific container
docker compose logs -f app     # Backend API
docker compose logs -f web     # Frontend
docker compose logs -f db      # PostgreSQL
docker compose logs -f nginx   # Reverse proxy
```

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                     Windows Server (On-Premise)                      │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                    Docker (Linux Containers)                     │ │
│  │                                                                  │ │
│  │    ┌──────────┐     ┌──────────┐     ┌──────────┐              │ │
│  │    │  Nginx   │────▶│ Frontend │     │ Backend  │              │ │
│  │    │  :80     │────▶│  (web)   │     │  (app)   │              │ │
│  │    └──────────┘     └──────────┘     └────┬─────┘              │ │
│  │         ▲                                  │                    │ │
│  │         │                                  ▼                    │ │
│  │    Port 80                           ┌──────────┐              │ │
│  │    (Host)                            │ Postgres │              │ │
│  │                                      │  (db)    │              │ │
│  │                                      └──────────┘              │ │
│  │                                           │                    │ │
│  │                                      [Volume]                  │ │
│  │                                    postgres_data               │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  C:\patient-tracker\                                                 │
│  ├── docker-compose.yml                                              │
│  ├── .env (restricted ACL)                                           │
│  ├── nginx.prod.conf                                                 │
│  ├── config\                                                         │
│  └── backups\                                                        │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
         │
         │  VPN / Internal Network
         ▼
    ┌──────────┐
    │  Client  │
    │ Browsers │
    └──────────┘
```

### CI/CD Pipeline

```
Developer                    GitHub                      Windows Server
─────────                    ──────                      ──────────────

git tag v1.3.0       ──▶  GitHub Actions triggers
git push --tags            1. Run tests (test.yml)
                           2. Build Docker images
                           3. Push to GHCR
                                    │
                                    ▼
                             ghcr.io/joyhe1234-coder/
                             patient-tracker-frontend:1.3.0
                             patient-tracker-backend:1.3.0
                                    │
                                    │  IT staff runs:
                                    │  .\update.ps1 -Version 1.3.0
                                    ▼
                                                         docker compose pull
                                                         docker compose up -d
                                                         Health check ✓
```

---

## Security Notes for Medical Environments

- **No patient data in Docker images** — all data lives in Docker volumes (PostgreSQL)
- **`.env` file** restricted to Administrators via Windows ACL
- **PostgreSQL port 5432** is NOT exposed outside the Docker network
- **Database backups** should be encrypted (see Backup & Restore section)
- **Images are built by GitHub Actions CI** — not on developer machines — with OCI provenance labels
- **GHCR authentication** uses a scoped Personal Access Token (`read:packages` only)
- Keep the Windows Server patched and behind your organization's VPN/firewall
