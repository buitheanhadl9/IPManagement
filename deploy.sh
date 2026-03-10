#!/bin/bash

# ============================================
# Deployment Script for IPManagement
# Server: Ubuntu 20.04/22.04
# Domain: managerip.o.io
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}IPManagement Deployment Script${NC}"
echo -e "${GREEN}============================================${NC}"

# ============================================
# Section 1: System Update
# ============================================
echo -e "\n${YELLOW}[1/10] Updating system packages...${NC}"
apt update && apt upgrade -y

# ============================================
# Section 2: Install Dependencies
# ============================================
echo -e "\n${YELLOW}[2/10] Installing dependencies...${NC}"
apt install -y git curl wget nginx ufw postgresql postgresql-contrib

# ============================================
# Section 3: Install .NET SDK 8
# ============================================
echo -e "\n${YELLOW}[3/10] Installing .NET SDK 8...${NC}"
wget https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
dpkg -i packages-microsoft-prod.deb
rm packages-microsoft-prod.deb
apt update
apt install -y dotnet-sdk-8.0

# ============================================
# Section 4: Install Node.js
# ============================================
echo -e "\n${YELLOW}[4/10] Installing Node.js 20...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# ============================================
# Section 5: Configure PostgreSQL
# ============================================
echo -e "\n${YELLOW}[5/10] Configuring PostgreSQL...${NC}"
systemctl start postgresql
systemctl enable postgresql

# Prompt for database password
echo -n "Enter PostgreSQL password for 'ipmanagement' user: "
read -s DB_PASSWORD
echo ""

sudo -u postgres psql << EOF
CREATE DATABASE "IPManagementDB";
CREATE USER "ipmanagement" WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE "IPManagementDB" TO "ipmanagement";
\q
EOF

sudo -u postgres psql -d IPManagementDB << EOF
GRANT ALL PRIVILEGES ON SCHEMA public TO "ipmanagement";
\q
EOF

echo -e "${GREEN}PostgreSQL configured successfully!${NC}"

# ============================================
# Section 6: Setup Application Directory
# ============================================
echo -e "\n${YELLOW}[6/10] Setting up application directory...${NC}"
mkdir -p /var/www/ipmanagement
cd /var/www/ipmanagement

# ============================================
# Section 7: Clone/Update Code
# ============================================
echo -e "\n${YELLOW}[7/10] Cloning/Updating code from GitHub...${NC}"
if [ -d ".git" ]; then
    git pull origin feature/ngay7thang3
else
    git clone https://github.com/buitheanhadl9/IPManagement.git .
    git checkout feature/ngay7thang3
fi

# ============================================
# Section 8: Configure Backend
# ============================================
echo -e "\n${YELLOW}[8/10] Configuring Backend API...${NC}"
cd IPManagement.API

# Create appsettings.Production.json
cat > appsettings.Production.json << EOF
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=IPManagementDB;Username=ipmanagement;Password=$DB_PASSWORD"
  },
  "JwtSettings": {
    "SecretKey": "YourVeryLongSecretKeyHereAtLeast32Characters!",
    "Issuer": "IPManagementAPI",
    "Audience": "IPManagementClient",
    "AccessTokenExpirationMinutes": 60,
    "RefreshTokenExpirationDays": 7
  }
}
EOF

# Restore and publish
dotnet restore
dotnet publish -c Release -o /var/www/ipmanagement/api-publish

# Move published files
rm -rf /var/www/ipmanagement/api
mv /var/www/ipmanagement/api-publish /var/www/ipmanagement/api

# ============================================
# Section 9: Configure Frontend
# ============================================
echo -e "\n${YELLOW}[9/10] Configuring Frontend...${NC}"
cd /var/www/ipmanagement/IPManagement.Web

# Create .env.production
cat > .env.production << EOF
VITE_API_URL=https://managerip.o.io/api
EOF

# Install dependencies and build
npm install
npm run build

# Move build files
rm -rf /var/www/ipmanagement/frontend
mv dist /var/www/ipmanagement/frontend

# ============================================
# Section 10: Configure Systemd and Nginx
# ============================================
echo -e "\n${YELLOW}[10/10] Configuring Systemd and Nginx...${NC}"

# Create systemd service
cat > /etc/systemd/system/ipmanagement-api.service << EOF
[Unit]
Description=IPManagement API
After=network.target postgresql.service

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/var/www/ipmanagement/api
ExecStart=/usr/bin/dotnet /var/www/ipmanagement/api/IPManagement.API.dll
Restart=always
RestartSec=10
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://localhost:5001

[Install]
WantedBy=multi-user.target
EOF

# Create Nginx config
cat > /etc/nginx/sites-available/ipmanagement << EOF
server {
    listen 80;
    server_name managerip.o.io;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name managerip.o.io;

    ssl_certificate /etc/letsencrypt/live/managerip.o.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/managerip.o.io/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        root /var/www/ipmanagement/frontend;
        try_files \$uri \$uri/ /index.html;
        gzip on;
        gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    }

    location /api {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /hubs {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/ipmanagement /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t

# Configure firewall
ufw allow 'Nginx Full'
ufw allow 22/tcp
ufw --force enable

# Start services
systemctl daemon-reload
systemctl enable ipmanagement-api
systemctl start ipmanagement-api
systemctl reload nginx

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}============================================${NC}"

# ============================================
# SSL Configuration
# ============================================
echo -e "\n${YELLOW}Installing SSL certificate with Let's Encrypt...${NC}"
apt install -y certbot python3-certbot-nginx
certbot --nginx -d managerip.o.io --non-interactive --agree-tos --email your-email@example.com

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Deployment and SSL Setup Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Access your application at: https://managerip.o.io${NC}"
echo -e "${GREEN}============================================${NC}"

# Show status
echo -e "\n${YELLOW}Service Status:${NC}"
systemctl status ipmanagement-api --no-pager | head -20
echo -e "\n${YELLOW}Nginx Status:${NC}"
systemctl status nginx --no-pager | head -10