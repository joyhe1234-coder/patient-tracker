#!/bin/bash
#
# Patient Quality Measure Tracker - Installation Script
# For Ubuntu/Debian systems
#
# Usage: sudo ./install.sh
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
INSTALL_DIR="/opt/patient-tracker"
DB_NAME="patienttracker"
DB_USER="appuser"
NODE_VERSION="20"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Patient Tracker Installation Script${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: Please run as root (sudo ./install.sh)${NC}"
    exit 1
fi

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo -e "${RED}Error: Cannot detect OS${NC}"
    exit 1
fi

echo -e "${YELLOW}Detected OS: $OS${NC}"

# Function to generate random password
generate_password() {
    openssl rand -hex 16
}

# Function to install on Debian/Ubuntu
install_debian() {
    echo -e "${GREEN}[1/8] Installing system packages...${NC}"
    apt-get update
    apt-get install -y curl gnupg2 openssl

    # Install Node.js
    echo -e "${GREEN}[2/8] Installing Node.js ${NODE_VERSION}...${NC}"
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
        apt-get install -y nodejs
    else
        echo "Node.js already installed: $(node --version)"
    fi

    # Install PostgreSQL
    echo -e "${GREEN}[3/8] Installing PostgreSQL 16...${NC}"
    if ! command -v psql &> /dev/null; then
        sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
        curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg
        apt-get update
        apt-get install -y postgresql-16
        systemctl enable postgresql
        systemctl start postgresql
    else
        echo "PostgreSQL already installed"
    fi

    # Install Nginx
    echo -e "${GREEN}[4/8] Installing Nginx...${NC}"
    if ! command -v nginx &> /dev/null; then
        apt-get install -y nginx
        systemctl enable nginx
    else
        echo "Nginx already installed"
    fi
}

# Function to install on RHEL/CentOS
install_rhel() {
    echo -e "${GREEN}[1/8] Installing system packages...${NC}"
    yum install -y curl openssl

    # Install Node.js
    echo -e "${GREEN}[2/8] Installing Node.js ${NODE_VERSION}...${NC}"
    if ! command -v node &> /dev/null; then
        curl -fsSL https://rpm.nodesource.com/setup_${NODE_VERSION}.x | bash -
        yum install -y nodejs
    else
        echo "Node.js already installed: $(node --version)"
    fi

    # Install PostgreSQL
    echo -e "${GREEN}[3/8] Installing PostgreSQL 16...${NC}"
    if ! command -v psql &> /dev/null; then
        yum install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-$(rpm -E %{rhel})-x86_64/pgdg-redhat-repo-latest.noarch.rpm
        yum install -y postgresql16-server postgresql16
        /usr/pgsql-16/bin/postgresql-16-setup initdb
        systemctl enable postgresql-16
        systemctl start postgresql-16
    else
        echo "PostgreSQL already installed"
    fi

    # Install Nginx
    echo -e "${GREEN}[4/8] Installing Nginx...${NC}"
    if ! command -v nginx &> /dev/null; then
        yum install -y nginx
        systemctl enable nginx
    else
        echo "Nginx already installed"
    fi
}

# Install based on OS
case $OS in
    ubuntu|debian)
        install_debian
        ;;
    centos|rhel|fedora|rocky|alma)
        install_rhel
        ;;
    *)
        echo -e "${RED}Error: Unsupported OS: $OS${NC}"
        echo "Supported: Ubuntu, Debian, CentOS, RHEL, Rocky, Alma"
        exit 1
        ;;
esac

# Generate passwords if not set
if [ -z "$DB_PASSWORD" ]; then
    DB_PASSWORD=$(generate_password)
    echo -e "${YELLOW}Generated DB password: $DB_PASSWORD${NC}"
fi

if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -hex 32)
    echo -e "${YELLOW}Generated JWT secret: $JWT_SECRET${NC}"
fi

# Setup database
echo -e "${GREEN}[5/8] Setting up database...${NC}"
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

# Build application
echo -e "${GREEN}[6/8] Building application...${NC}"
cd "$INSTALL_DIR"

# Check if node_modules exists (pre-built bundle)
if [ ! -d "backend/node_modules" ]; then
    echo "Installing backend dependencies..."
    cd backend
    npm ci
    cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend
    npm ci
    cd ..
fi

# Build backend
cd backend
npx prisma generate
npm run build
cd ..

# Build frontend
cd frontend
npm run build
cd ..

# Create backend .env file
echo -e "${GREEN}[7/8] Configuring application...${NC}"
cat > backend/.env << EOF
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=8h
NODE_ENV=production
PORT=3000
APP_URL=http://localhost

# Optional: SMTP Configuration for password reset emails
# SMTP_HOST=mail.yourcompany.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=noreply@yourcompany.com
# SMTP_PASS=your_email_password
# SMTP_FROM=Patient Tracker <noreply@yourcompany.com>
EOF

# Run migrations
cd backend
npx prisma migrate deploy
npm run db:seed
cd ..

# Configure Nginx
cat > /etc/nginx/sites-available/patient-tracker << 'EOF'
server {
    listen 80;
    server_name _;

    root /opt/patient-tracker/frontend/dist;
    index index.html;

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

    # Frontend SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/patient-tracker /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Create systemd service
cat > /etc/systemd/system/patient-tracker.service << EOF
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
EOF

# Set permissions and start service
chown -R www-data:www-data "$INSTALL_DIR"
systemctl daemon-reload
systemctl enable patient-tracker
systemctl start patient-tracker

# Create admin user
echo -e "${GREEN}[8/8] Creating admin user...${NC}"
ADMIN_PASSWORD=$(generate_password)
cd "$INSTALL_DIR/backend"
npm run reset-password admin@localhost "$ADMIN_PASSWORD" 2>/dev/null || true

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Installation Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Application URL: ${YELLOW}http://$(hostname -I | awk '{print $1}')${NC}"
echo ""
echo -e "Admin Login:"
echo -e "  Email:    ${YELLOW}admin@localhost${NC}"
echo -e "  Password: ${YELLOW}$ADMIN_PASSWORD${NC}"
echo ""
echo -e "Database:"
echo -e "  Host:     localhost"
echo -e "  Database: $DB_NAME"
echo -e "  User:     $DB_USER"
echo -e "  Password: ${YELLOW}$DB_PASSWORD${NC}"
echo ""
echo -e "JWT Secret: ${YELLOW}$JWT_SECRET${NC}"
echo ""
echo -e "${RED}IMPORTANT: Save these credentials securely!${NC}"
echo ""
echo -e "Configuration files:"
echo -e "  Backend:  $INSTALL_DIR/backend/.env"
echo -e "  Nginx:    /etc/nginx/sites-available/patient-tracker"
echo -e "  Service:  /etc/systemd/system/patient-tracker.service"
echo ""
echo -e "Commands:"
echo -e "  Check status:  systemctl status patient-tracker"
echo -e "  View logs:     journalctl -u patient-tracker -f"
echo -e "  Restart:       systemctl restart patient-tracker"
