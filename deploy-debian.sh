#!/bin/bash

# Script Deploy IPManagement lên Debian Server
# Branch: ngày-25-thang-3-nam-2026
# Commit: Hoàn thiện phần quản lý đơn vị và quản lý IP

set -e

# Màu cho output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Biến cấu hình - SỬA CÁC GIÁ TRỊ NÀY THEO CẤU HÌNH CỦA BẠN
DOMAIN="ip.o.io"
DB_NAME="IPManagementDB"
DB_USER="ipmanagement"
DB_PASSWORD="YourStrongPassword!"
APP_DIR="/var/www/ipmanagement"
BRANCH="ngày-25-thang-3-nam-2026"
GITHUB_REPO="https://github.com/buitheanhadl9/IPManagement-branch.git"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  IPManagement Deployment Script${NC}"
echo -e "${GREEN}  Branch: ${BRANCH}${NC}"
echo -e "${GREEN}========================================${NC}"

# Hàm in thông báo
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Kiểm tra quyền root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "Vui lòng chạy script với quyền root (sudo bash deploy-debian.sh)"
        exit 1
    fi
}

# Bước 1: Cập nhật hệ thống
step1_update_system() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Bước 1: Cập nhật hệ thống${NC}"
    echo -e "${GREEN}========================================${NC}"
    
    apt update && apt upgrade -y
    log_info "Đã cập nhật hệ thống"
}

# Bước 2: Cài đặt packages cần thiết
step2_install_packages() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Bước 2: Cài đặt packages cần thiết${NC}"
    echo -e "${GREEN}========================================${NC}"
    
    apt install -y git curl wget nginx ca-certificates gnupg apt-transport-https
    log_info "Đã cài đặt packages"
}

# Bước 3: Cài đặt .NET SDK 9.0
step3_install_dotnet() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Bước 3: Cài đặt .NET SDK 9.0${NC}"
    echo -e "${GREEN}========================================${NC}"
    
    wget https://packages.microsoft.com/config/debian/12/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
    dpkg -i packages-microsoft-prod.deb
    rm packages-microsoft-prod.deb
    
    apt update
    apt install -y dotnet-sdk-9.0
    
    dotnet --version
    log_info "Đã cài đặt .NET SDK 9.0"
}

# Bước 4: Cài đặt Node.js
step4_install_nodejs() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Bước 4: Cài đặt Node.js 20.x${NC}"
    echo -e "${GREEN}========================================${NC}"
    
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    
    node --version
    npm --version
    log_info "Đã cài đặt Node.js"
}

# Bước 5: Cài đặt PostgreSQL
step5_install_postgresql() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Bước 5: Cài đặt PostgreSQL 16${NC}"
    echo -e "${GREEN}========================================${NC}"
    
    apt install -y gnupg postgresql-common
    
    sh /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh
    
    apt install -y postgresql-16 postgresql-contrib-16
    
    systemctl start postgresql
    systemctl enable postgresql
    
    log_info "Đã cài đặt PostgreSQL 16"
    
    # Tạo database và user
    echo -e "${YELLOW}Đang tạo database và user...${NC}"
    
    sudo -u postgres psql << EOF
CREATE DATABASE "$DB_NAME";
CREATE USER "$DB_USER" WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE "$DB_NAME" TO "$DB_USER";
EOF
    
    log_info "Đã tạo database $DB_NAME và user $DB_USER"
}

# Bước 6: Cấu hình firewall
step6_configure_firewall() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Bước 6: Cấu hình firewall${NC}"
    echo -e "${GREEN}========================================${NC}"
    
    ufw allow OpenSSH || true
    ufw allow 'Nginx Full'
    ufw allow 5432/tcp  # PostgreSQL (chỉ mở nếu cần remote access)
    
    log_info "Đã cấu hình firewall"
}

# Bước 7: Clone code và build backend
step7_deploy_backend() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Bước 7: Deploy Backend${NC}"
    echo -e "${GREEN}========================================${NC}"
    
    # Tạo thư mục ứng dụng
    mkdir -p $APP_DIR
    cd $APP_DIR
    
    # Clone code
    if [ -d ".git" ]; then
        log_info "Cập nhật code từ GitHub..."
        git pull origin $BRANCH
    else
        log_info "Clone code từ GitHub..."
        git clone $GITHUB_REPO .
        git checkout $BRANCH
    fi
    
    # Cấu hình appsettings.Production.json
    log_info "Tạo file cấu hình production..."
    cat > IPManagement.API/appsettings.Production.json << EOF
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=$DB_NAME;Username=$DB_USER;Password=$DB_PASSWORD"
  },
  "AppSettings": {
    "BaseUrl": "http://localhost:5001",
    "FrontendUrl": "http://localhost:5173"
  },
  "FileStorage": {
    "DrawingUploadPath": "uploads/drawings",
    "MaxFileSize": 52428800,
    "AllowedExtensions": [".pdf", ".dwg", ".png", ".jpg", ".jpeg", ".vsdx"]
  }
}
EOF
    
    # Build backend
    cd IPManagement.API
    log_info "Restore packages..."
    dotnet restore
    
    log_info "Build backend..."
    dotnet build -c Release
    
    # Migrate database
    log_info "Migrate database..."
    dotnet ef database update --connection "Host=localhost;Port=5432;Database=$DB_NAME;Username=$DB_USER;Password=$DB_PASSWORD"
    
    # Tạo thư mục uploads
    mkdir -p uploads/drawings
    chmod -R 755 uploads
    chown -R www-data:www-data uploads
    
    log_info "Đã deploy backend"
}

# Bước 8: Build frontend
step8_deploy_frontend() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Bước 8: Deploy Frontend${NC}"
    echo -e "${GREEN}========================================${NC}"
    
    cd $APP_DIR/IPManagement.Web
    
    # Tạo file .env.production
    log_info "Tạo file .env.production..."
    cat > .env.production << EOF
VITE_API_URL=https://$DOMAIN/api
EOF
    
    # Install dependencies
    log_info "Install dependencies..."
    npm install
    
    # Build
    log_info "Build frontend..."
    npm run build
    
    log_info "Đã build frontend"
}

# Bước 9: Tạo systemd service
step9_create_systemd_service() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Bước 9: Tạo systemd service${NC}"
    echo -e "${GREEN}========================================${NC}"
    
    cat > /etc/systemd/system/ipmanagement-api.service << EOF
[Unit]
Description=IPManagement API
After=network.target postgresql.service

[Service]
Type=notify
WorkingDirectory=$APP_DIR/IPManagement.API
ExecStart=/usr/bin/dotnet $APP_DIR/IPManagement.API/IPManagement.API.dll
Configuration=Production
Restart=always
RestartSec=10
SyslogIdentifier=ipmanagement-api
User=www-data
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=DOTNET_PRINT_TELEMETRY_MESSAGE=false

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable ipmanagement-api
    systemctl start ipmanagement-api
    
    log_info "Đã tạo và start systemd service"
}

# Bước 10: Cấu hình Nginx
step10_configure_nginx() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Bước 10: Cấu hình Nginx${NC}"
    echo -e "${GREEN}========================================${NC}"
    
    cat > /etc/nginx/sites-available/ipmanagement << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    # Frontend
    location / {
        root $APP_DIR/IPManagement.Web/dist;
        try_files \$uri \$uri/ /index.html;
        
        # Gzip compression
        gzip on;
        gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    }

    # Backend API
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

    # SignalR Hub
    location /NotificationHub {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Uploads
    location /uploads {
        alias $APP_DIR/IPManagement.API/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF
    
    # Enable site
    ln -sf /etc/nginx/sites-available/ipmanagement /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Test và restart
    nginx -t
    systemctl restart nginx
    systemctl enable nginx
    
    log_info "Đã cấu hình Nginx"
}

# Bước 11: Cài đặt SSL (tùy chọn)
step11_configure_ssl() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Bước 11: Cấu hình SSL (Let's Encrypt)${NC}"
    echo -e "${GREEN}========================================${NC}"
    
    read -p "Bạn có muốn cấu hình SSL không? (y/n): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Nhập email cho Let's Encrypt: " EMAIL
        
        apt install -y certbot python3-certbot-nginx
        
        certbot --nginx -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --no-eff-email --redirect
        
        log_info "Đã cấu hình SSL"
    else
        log_warn "Bỏ qua cấu hình SSL"
    fi
}

# Hiển thị thông tin deployment
show_info() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Deployment Complete!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Thông tin truy cập:${NC}"
    echo -e "  Frontend: https://$DOMAIN"
    echo -e "  API:      https://$DOMAIN/api"
    echo -e "  Swagger:  https://$DOMAIN/swagger"
    echo -e "${GREEN}========================================${NC}"
    echo -e "${YELLOW}Lưu ý:${NC}"
    echo -e "  - Nếu chưa cấu hình SSL, truy cập qua HTTP: http://$DOMAIN"
    echo -e "  - Kiểm tra log backend: journalctl -u ipmanagement-api -f"
    echo -e "  - Kiểm tra log Nginx: tail -f /var/log/nginx/error.log"
    echo -e "${GREEN}========================================${NC}"
}

# Main execution
main() {
    check_root
    
    step1_update_system
    step2_install_packages
    step3_install_dotnet
    step4_install_nodejs
    step5_install_postgresql
    step6_configure_firewall
    step7_deploy_backend
    step8_deploy_frontend
    step9_create_systemd_service
    step10_configure_nginx
    step11_configure_ssl
    
    show_info
}

# Chạy script
main
