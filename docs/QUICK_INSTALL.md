# Patient Tracker - Quick Install Guide (Docker)

This is the fastest way to deploy Patient Tracker. Total time: ~10 minutes.

**No git required. No building required. Just download, configure, and run.**

---

## Prerequisites

- **Server:** Linux (Ubuntu, Debian, CentOS, or RHEL)
- **Docker:** Version 24.0 or newer
- **Docker Compose:** Version 2.20 or newer
- **Ports:** 80 (HTTP) available

### Install Docker (if not installed)

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in

# Verify
docker --version
docker compose version
```

---

## Step 1: Download 3 Files

Create a directory and download these files from the repository:

```bash
mkdir -p /opt/patient-tracker && cd /opt/patient-tracker

# Download the 3 required files (replace YOUR_ORG with actual org)
curl -O https://raw.githubusercontent.com/YOUR_ORG/patient-tracker/main/docker-compose.prod.yml
curl -O https://raw.githubusercontent.com/YOUR_ORG/patient-tracker/main/nginx/nginx.prod.conf
curl -O https://raw.githubusercontent.com/YOUR_ORG/patient-tracker/main/.env.example
```

Or download manually from GitHub and transfer to server via USB/SCP.

**Files needed:**
| File | Purpose |
|------|---------|
| `docker-compose.prod.yml` | Docker configuration |
| `nginx.prod.conf` | Web server configuration |
| `.env.example` | Configuration template |

---

## Step 2: Configure

```bash
# Copy template
cp .env.example .env

# Edit configuration
nano .env
```

### Required Settings (must change these)

```env
# Database password - make it strong!
DB_PASSWORD=MySecureP@ssw0rd123

# JWT secret - generate with: openssl rand -hex 32
JWT_SECRET=a1b2c3d4e5f6...your64characterstring...
```

### Optional Settings

```env
# Token expiration (default: 8 hours)
JWT_EXPIRES_IN=8h

# Your server's public URL (for email links)
APP_URL=https://your-domain.com
```

### Email Settings (for "Forgot Password" feature)

If you have an SMTP server, configure these. If not, users must contact admin to reset passwords.

```env
SMTP_HOST=mail.yourcompany.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@yourcompany.com
SMTP_PASS=emailpassword
SMTP_FROM=Patient Tracker <noreply@yourcompany.com>
```

---

## Step 3: Start

```bash
# Pull the Docker images from Docker Hub
docker compose -f docker-compose.prod.yml pull

# Start all services
docker compose -f docker-compose.prod.yml up -d

# Check status (all should show "running")
docker compose -f docker-compose.prod.yml ps

# View logs if needed
docker compose -f docker-compose.prod.yml logs -f
```

---

## Step 4: Initialize Database

```bash
# Run database migrations
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy

# Load initial data (quality measures, request types, etc.)
docker compose -f docker-compose.prod.yml exec app npm run db:seed
```

---

## Step 5: Create Admin User

```bash
# Create admin account (replace email and password)
docker compose -f docker-compose.prod.yml exec app npm run reset-password admin@yourcompany.com YourSecurePassword123!
```

---

## Step 6: Access the Application

Open browser: `http://your-server-ip`

Login with the admin credentials you created.

---

## Configuration Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DB_PASSWORD` | **Yes** | - | PostgreSQL password |
| `JWT_SECRET` | **Yes** | - | 64-char secret for auth tokens |
| `JWT_EXPIRES_IN` | No | `8h` | Token expiration (e.g., `8h`, `1d`) |
| `APP_URL` | No | `http://localhost` | Public URL for email links |
| `SMTP_HOST` | No | - | Email server hostname |
| `SMTP_PORT` | No | - | Email server port (usually 587) |
| `SMTP_SECURE` | No | `false` | Use SSL (true for port 465) |
| `SMTP_USER` | No | - | Email account username |
| `SMTP_PASS` | No | - | Email account password |
| `SMTP_FROM` | No | - | From address for emails |

---

## How to Update

Updating is simple - just pull the new images and restart:

```bash
cd /opt/patient-tracker

# Pull latest images from Docker Hub
docker compose -f docker-compose.prod.yml pull

# Restart with new images (database data is preserved)
docker compose -f docker-compose.prod.yml up -d

# Run any new database migrations
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy

# Verify all services are running
docker compose -f docker-compose.prod.yml ps
```

> **Note:** Your database data is safe during updates. Data is stored in a Docker volume separate from containers. Only `docker compose down -v` (with `-v` flag) would delete data.

### Update to Specific Version

To update to a specific version instead of latest:

```bash
# Set version in .env file
echo "VERSION=v4.1.0" >> .env

# Or specify on command line
VERSION=v4.1.0 docker compose -f docker-compose.prod.yml pull
VERSION=v4.1.0 docker compose -f docker-compose.prod.yml up -d
```

---

## Common Commands

| Task | Command |
|------|---------|
| **Pull latest images** | `docker compose -f docker-compose.prod.yml pull` |
| Start services | `docker compose -f docker-compose.prod.yml up -d` |
| Stop services | `docker compose -f docker-compose.prod.yml down` |
| View logs | `docker compose -f docker-compose.prod.yml logs -f` |
| Restart | `docker compose -f docker-compose.prod.yml restart` |
| Check status | `docker compose -f docker-compose.prod.yml ps` |
| Backup database | `docker compose -f docker-compose.prod.yml exec db pg_dump -U appuser patienttracker > backup.sql` |
| Restore database | `docker compose -f docker-compose.prod.yml exec -T db psql -U appuser patienttracker < backup.sql` |
| Reset user password | `docker compose -f docker-compose.prod.yml exec app npm run reset-password user@email.com NewPassword123!` |

---

## Troubleshooting

### Services not starting
```bash
# Check logs for errors
docker compose -f docker-compose.prod.yml logs app
docker compose -f docker-compose.prod.yml logs db
```

### Database connection error
```bash
# Wait for database to be healthy
docker compose -f docker-compose.prod.yml ps  # db should show "healthy"

# If stuck, restart
docker compose -f docker-compose.prod.yml restart db
```

### Can't access in browser
```bash
# Check if port 80 is in use
sudo lsof -i :80

# Check nginx is running
docker compose -f docker-compose.prod.yml logs nginx
```

### Need to reset everything
```bash
# ⚠️ WARNING: The -v flag deletes ALL data including patients, users, and settings!
# Only use this if you want to start completely fresh
docker compose -f docker-compose.prod.yml down -v
docker compose -f docker-compose.prod.yml up -d
# Then re-run Step 4 and Step 5
```

> **Safe commands (keep data):** `down`, `stop`, `restart`, `build`, `up -d`
> **Dangerous command (deletes data):** `down -v` (the `-v` removes volumes)

---

## Adding SSL (HTTPS)

For production, add SSL with Let's Encrypt:

```bash
# Install certbot
sudo apt install certbot

# Get certificate (stop nginx first)
docker compose -f docker-compose.prod.yml stop nginx
sudo certbot certonly --standalone -d your-domain.com
docker compose -f docker-compose.prod.yml start nginx
```

Then update `nginx/nginx.prod.conf` to use the certificates. See `docs/INSTALLATION_GUIDE.md` for full SSL instructions.

---

## Support

- Full documentation: `docs/INSTALLATION_GUIDE.md`
- Issues: Contact your system administrator

---

*Last Updated: February 2, 2026*
