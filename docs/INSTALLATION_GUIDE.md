# Patient Quality Measure Tracker - Installation Guide

This guide covers deploying the Patient Quality Measure Tracker on a self-hosted server (without Render or Kubernetes).

---

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Architecture Overview](#architecture-overview)
3. [Deployment Options](#deployment-options)
4. [Option A: Docker Compose (Recommended)](#option-a-docker-compose-recommended)
5. [Option B: Manual Installation](#option-b-manual-installation)
6. [Environment Variables Reference](#environment-variables-reference)
7. [Initial Setup](#initial-setup)
8. [SSL/TLS Configuration](#ssltls-configuration)
9. [Backup and Restore](#backup-and-restore)
10. [Troubleshooting](#troubleshooting)
11. [Updating the Application](#updating-the-application)

---

## System Requirements

### Minimum Hardware
| Resource | Requirement |
|----------|-------------|
| CPU | 2 cores |
| RAM | 4 GB |
| Disk | 20 GB SSD |

### Software Prerequisites
| Software | Version | Purpose |
|----------|---------|---------|
| Docker + Docker Compose | 24.0+ / 2.20+ | Container runtime (Option A) |
| Node.js | 20.x LTS | Backend runtime (Option B) |
| PostgreSQL | 16.x | Database |
| Nginx | 1.24+ | Reverse proxy / static file server |

### Network Requirements
| Port | Purpose |
|------|---------|
| 80 | HTTP (redirects to HTTPS) |
| 443 | HTTPS (application) |
| 5432 | PostgreSQL (internal only, not exposed externally) |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Browser                        │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTPS (443)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                      Nginx (Reverse Proxy)                   │
│  - Serves frontend static files (/)                         │
│  - Proxies API requests (/api/*)                            │
│  - Proxies WebSocket (/socket.io/*)                         │
│  - SSL termination                                          │
└──────────┬─────────────────────────────────┬────────────────┘
           │                                 │
           ▼                                 ▼
┌─────────────────────┐         ┌─────────────────────────────┐
│   Frontend Files    │         │     Backend API (Node.js)   │
│   (Static HTML/JS)  │         │     - Express.js            │
│   Built with Vite   │         │     - Prisma ORM            │
└─────────────────────┘         │     - Socket.io             │
                                └──────────────┬──────────────┘
                                               │
                                               ▼
                                ┌─────────────────────────────┐
                                │     PostgreSQL Database     │
                                │     - Patient data          │
                                │     - Configuration         │
                                │     - Audit logs            │
                                └─────────────────────────────┘
```

---

## Deployment Options

| Option | Best For | Complexity |
|--------|----------|------------|
| **A: Docker Compose** | Most deployments | Low |
| **B: Manual Installation** | Custom environments, Windows servers | Medium |

---

## Option A: Docker Compose (Recommended)

### Step 1: Install Docker

**Ubuntu/Debian:**
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt-get install docker-compose-plugin

# Add your user to docker group (logout/login required)
sudo usermod -aG docker $USER
```

**RHEL/CentOS:**
```bash
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo systemctl start docker
sudo systemctl enable docker
```

### Step 2: Clone Repository

```bash
cd /opt
sudo git clone https://github.com/YOUR_ORG/patient-tracker.git
cd patient-tracker
```

### Step 3: Configure Environment Variables

```bash
# Create environment file
sudo cp .env.example .env
sudo nano .env
```

**Edit `.env` file:**
```env
# Database
DB_PASSWORD=your_secure_database_password_here

# JWT Authentication (generate a random 64-character string)
JWT_SECRET=your_64_character_random_string_here

# Environment
NODE_ENV=production

# Application URL (for password reset emails, etc.)
APP_URL=https://your-domain.com

# Optional: SMTP Configuration (for password reset emails)
# If not configured, "Forgot Password" will show "Contact Administrator"
# SMTP_HOST=mail.yourcompany.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=noreply@yourcompany.com
# SMTP_PASS=your_email_password
# SMTP_FROM=Patient Tracker <noreply@yourcompany.com>
```

**Generate a secure JWT secret:**
```bash
openssl rand -hex 32
```

### Step 4: Build and Start Services

```bash
# Build containers
docker compose build

# Start services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### Step 5: Initialize Database

```bash
# Run database migrations
docker compose exec app npx prisma migrate deploy

# Seed initial data (request types, quality measures, etc.)
docker compose exec app npm run db:seed
```

### Step 6: Create Admin User

```bash
# Create initial admin user
docker compose exec app npm run reset-password admin@yourcompany.com YourSecurePassword123!
```

> **Note:** This creates a user if it doesn't exist, or resets the password if it does.

### Step 7: Access the Application

Open your browser and navigate to:
- **HTTP:** `http://your-server-ip`
- **HTTPS:** `https://your-domain.com` (after SSL setup)

---

## Option B: Manual Installation

### Step 1: Install Node.js 20

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**RHEL/CentOS:**
```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs
```

### Step 2: Install PostgreSQL 16

**Ubuntu/Debian:**
```bash
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt-get update
sudo apt-get install -y postgresql-16
```

**Create database and user:**
```bash
sudo -u postgres psql << EOF
CREATE USER appuser WITH PASSWORD 'your_secure_password';
CREATE DATABASE patienttracker OWNER appuser;
GRANT ALL PRIVILEGES ON DATABASE patienttracker TO appuser;
EOF
```

### Step 3: Install Nginx

```bash
sudo apt-get install -y nginx
sudo systemctl enable nginx
```

### Step 4: Clone and Build Application

```bash
# Clone repository
cd /opt
sudo git clone https://github.com/YOUR_ORG/patient-tracker.git
cd patient-tracker

# Install backend dependencies
cd backend
npm ci

# Generate Prisma client
npx prisma generate

# Build backend
npm run build

# Install frontend dependencies
cd ../frontend
npm ci

# Build frontend (creates dist/ folder)
npm run build
```

### Step 5: Configure Backend Environment

```bash
cd /opt/patient-tracker/backend
sudo nano .env
```

```env
# Database connection
DATABASE_URL=postgresql://appuser:your_secure_password@localhost:5432/patienttracker

# JWT Configuration
JWT_SECRET=your_64_character_random_string_here
JWT_EXPIRES_IN=8h

# Environment
NODE_ENV=production
PORT=3000

# Application URL
APP_URL=https://your-domain.com

# Optional: SMTP for password reset emails
# SMTP_HOST=mail.yourcompany.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=noreply@yourcompany.com
# SMTP_PASS=your_email_password
# SMTP_FROM=Patient Tracker <noreply@yourcompany.com>
```

### Step 6: Initialize Database

```bash
cd /opt/patient-tracker/backend

# Run migrations
npx prisma migrate deploy

# Seed initial data
npm run db:seed
```

### Step 7: Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/patient-tracker
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend static files
    root /opt/patient-tracker/frontend/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # API proxy
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket proxy
    location /socket.io {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Frontend routes (SPA fallback)
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/patient-tracker /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### Step 8: Create Systemd Service for Backend

```bash
sudo nano /etc/systemd/system/patient-tracker.service
```

```ini
[Unit]
Description=Patient Tracker Backend
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/patient-tracker/backend
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
# Set permissions
sudo chown -R www-data:www-data /opt/patient-tracker

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable patient-tracker
sudo systemctl start patient-tracker

# Check status
sudo systemctl status patient-tracker
```

### Step 9: Create Admin User

```bash
cd /opt/patient-tracker/backend
npm run reset-password admin@yourcompany.com YourSecurePassword123!
```

---

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `JWT_SECRET` | Secret for JWT signing (64+ chars) | `openssl rand -hex 32` |
| `NODE_ENV` | Environment mode | `production` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Backend API port | `3000` |
| `JWT_EXPIRES_IN` | Token expiration time | `8h` |
| `BCRYPT_SALT_ROUNDS` | Password hashing rounds | `12` |
| `APP_URL` | Public URL for email links | Required for password reset |

### SMTP Variables (Optional - for Password Reset Emails)

| Variable | Description | Example |
|----------|-------------|---------|
| `SMTP_HOST` | Mail server hostname | `mail.company.com` |
| `SMTP_PORT` | Mail server port | `587` |
| `SMTP_SECURE` | Use SSL (true for port 465) | `false` |
| `SMTP_USER` | Mail account username | `noreply@company.com` |
| `SMTP_PASS` | Mail account password | `secretpassword` |
| `SMTP_FROM` | From address for emails | `Patient Tracker <noreply@company.com>` |

> **Note:** If SMTP is not configured, the "Forgot Password" feature will display "Contact your administrator" instead.

---

## Initial Setup

### First Login

1. Navigate to `https://your-domain.com/login`
2. Login with the admin user you created
3. Go to **Admin** panel to create additional users

### Creating Users

1. Click **Admin** in the header
2. Click **Add User**
3. Fill in user details:
   - **Email:** User's email address
   - **Display Name:** Full name
   - **Role:** PHYSICIAN, STAFF, or ADMIN
   - **Password:** Initial password
4. For STAFF users, assign them to physicians

### User Roles

| Role | Permissions |
|------|-------------|
| **PHYSICIAN** | View/edit own patients only |
| **STAFF** | View/edit assigned physicians' patients |
| **ADMIN** | User management + view any physician's patients |

---

## SSL/TLS Configuration

### Option 1: Let's Encrypt (Recommended for Internet-facing)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is configured automatically
```

### Option 2: Self-Signed Certificate (Internal/VPN)

```bash
# Generate self-signed certificate
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/patient-tracker.key \
    -out /etc/ssl/certs/patient-tracker.crt \
    -subj "/CN=your-domain.com"
```

Update Nginx configuration:
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/ssl/certs/patient-tracker.crt;
    ssl_certificate_key /etc/ssl/private/patient-tracker.key;

    # ... rest of config
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

### Option 3: Corporate Certificate

If your organization has an internal CA, work with your IT team to obtain a certificate and configure it similarly to Option 2.

---

## Backup and Restore

### Automated Daily Backups

```bash
# Create backup script
sudo nano /opt/patient-tracker/scripts/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR=/opt/patient-tracker/backups
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE=$BACKUP_DIR/patienttracker_$DATE.sql.gz

# Create backup directory
mkdir -p $BACKUP_DIR

# Dump database
pg_dump -U appuser -h localhost patienttracker | gzip > $BACKUP_FILE

# Keep only last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup created: $BACKUP_FILE"
```

```bash
# Make executable
sudo chmod +x /opt/patient-tracker/scripts/backup.sh

# Add to crontab (daily at 2 AM)
echo "0 2 * * * /opt/patient-tracker/scripts/backup.sh" | sudo crontab -
```

### Manual Backup

```bash
# Docker Compose
docker compose exec db pg_dump -U appuser patienttracker > backup.sql

# Manual installation
pg_dump -U appuser -h localhost patienttracker > backup.sql
```

### Restore from Backup

```bash
# Docker Compose
docker compose exec -T db psql -U appuser patienttracker < backup.sql

# Manual installation
psql -U appuser -h localhost patienttracker < backup.sql
```

---

## Troubleshooting

### Check Service Status

```bash
# Docker Compose
docker compose ps
docker compose logs app
docker compose logs db

# Manual installation
sudo systemctl status patient-tracker
sudo journalctl -u patient-tracker -f
```

### Common Issues

#### "Connection refused" to database
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection
psql -U appuser -h localhost -d patienttracker
```

#### "502 Bad Gateway" from Nginx
```bash
# Check backend is running
curl http://localhost:3000/api/health

# Check Nginx config
sudo nginx -t

# Check backend logs
sudo journalctl -u patient-tracker -n 50
```

#### "CORS error" in browser
Ensure `APP_URL` in `.env` matches the URL you're accessing the app from.

#### Database migration failed
```bash
# Check Prisma migration status
cd /opt/patient-tracker/backend
npx prisma migrate status

# Reset if needed (WARNING: deletes all data)
npx prisma migrate reset
```

---

## Updating the Application

### Docker Compose

```bash
cd /opt/patient-tracker

# Pull latest code
git pull origin main

# Rebuild and restart
docker compose build
docker compose up -d

# Run any new migrations
docker compose exec app npx prisma migrate deploy
```

### Manual Installation

```bash
cd /opt/patient-tracker

# Pull latest code
git pull origin main

# Update backend
cd backend
npm ci
npx prisma generate
npm run build
npx prisma migrate deploy
sudo systemctl restart patient-tracker

# Update frontend
cd ../frontend
npm ci
npm run build
```

---

## Security Recommendations

1. **Change default passwords** immediately after installation
2. **Use HTTPS** in production (SSL/TLS)
3. **Restrict database access** - PostgreSQL should only be accessible from localhost
4. **Enable firewall** - Only allow ports 80, 443, and SSH
5. **Keep software updated** - Regularly update Node.js, PostgreSQL, and dependencies
6. **Regular backups** - Test restore procedures periodically
7. **Audit logs** - Review audit logs in Admin panel for suspicious activity

---

## Support

For issues and feature requests, contact your system administrator or submit an issue on the project repository.

---

*Last Updated: February 2, 2026*
