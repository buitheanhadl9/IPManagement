# Hướng dẫn triển khai IPManagement lên server Linux

## Thông tin deployment
- **Tên miền:** managerip.o.io
- **OS:** Linux (Ubuntu 20.04/22.04 recommended)
- **Backend:** .NET 8 API
- **Frontend:** React + Vite
- **Database:** PostgreSQL

---

## Phần 1: Chuẩn bị server

### 1.1. Kết nối SSH vào server
```bash
ssh root@managerip.o.io
```

### 1.2. Cập nhật hệ thống
```bash
apt update && apt upgrade -y
```

### 1.3. Cài đặt các package cần thiết
```bash
apt install -y git curl wget nginx ufw
```

---

## Phần 2: Cài đặt .NET SDK

### 2.1. Cài đặt .NET 8 SDK
```bash
# Thêm Microsoft package repository
wget https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
dpkg -i packages-microsoft-prod.deb
rm packages-microsoft-prod.deb

# Cập nhật và cài đặt .NET 8
apt update
apt install -y dotnet-sdk-8.0
```

### 2.2. Kiểm tra cài đặt
```bash
dotnet --version
```

---

## Phần 3: Cài đặt PostgreSQL

### 3.1. Cài đặt PostgreSQL
```bash
apt install -y postgresql postgresql-contrib
```

### 3.2. Khởi động và enable PostgreSQL
```bash
systemctl start postgresql
systemctl enable postgresql
```

### 3.3. Tạo database và user
```bash
sudo -u postgres psql

-- Trong PostgreSQL shell:
CREATE DATABASE "IPManagementDB";
CREATE USER "ipmanagement" WITH PASSWORD 'YourStrongPassword!';
GRANT ALL PRIVILEGES ON DATABASE "IPManagementDB" TO "ipmanagement";
\q
```

### 3.4. Cấp quyền cho user
```bash
sudo -u postgres psql -d IPManagementDB

-- Trong PostgreSQL shell:
GRANT ALL PRIVILEGES ON SCHEMA public TO "ipmanagement";
\q
```

---

## Phần 4: Cấu hình Backend API

### 4.1. Tạo thư mục cho ứng dụng
```bash
mkdir -p /var/www/ipmanagement
cd /var/www/ipmanagement
```

### 4.2. Clone code từ GitHub
```bash
git clone https://github.com/buitheanhadl9/IPManagement.git .
git checkout feature/ngay7thang3
```

### 4.3. Cấu hình appsettings.json cho production
```bash
cd IPManagement.API
```

Sửa file `appsettings.Production.json` (tạo mới nếu chưa có):
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=IPManagementDB;Username=ipmanagement;Password=YourStrongPassword!"
  },
  "JwtSettings": {
    "SecretKey": "YourVeryLongSecretKeyHereAtLeast32Characters!",
    "Issuer": "IPManagementAPI",
    "Audience": "IPManagementClient",
    "AccessTokenExpirationMinutes": 60,
    "RefreshTokenExpirationDays": 7
  }
}
```

### 4.4. Build và publish API
```bash
dotnet restore
dotnet publish -c Release -o /var/www/ipmanagement/api-publish
```

### 4.5. Di chuyển files đã publish
```bash
mv /var/www/ipmanagement/api-publish /var/www/ipmanagement/api
```

---

## Phần 5: Cấu hình Frontend

### 5.1. Cài đặt Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

### 5.2. Build frontend
```bash
cd /var/www/ipmanagement/IPManagement.Web
npm install

# Tạo file .env.production
cat > .env.production << EOF
VITE_API_URL=https://managerip.o.io/api
EOF

# Build
npm run build
```

### 5.3. Di chuyển files build
```bash
mv dist /var/www/ipmanagement/frontend
```

---

## Phần 6: Cấu hình Systemd service cho API

### 6.1. Tạo file service
```bash
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
```

### 6.2. Enable và start service
```bash
systemctl daemon-reload
systemctl enable ipmanagement-api
systemctl start ipmanagement-api
systemctl status ipmanagement-api
```

---

## Phần 7: Cấu hình Nginx

### 7.1. Tạo file cấu hình Nginx
```bash
cat > /etc/nginx/sites-available/ipmanagement << EOF
server {
    listen 80;
    server_name managerip.o.io;
    
    # Redirect HTTP to HTTPS (sau khi có SSL)
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name managerip.o.io;

    # SSL Configuration (sau khi có cert)
    ssl_certificate /etc/letsencrypt/live/managerip.o.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/managerip.o.io/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend
    location / {
        root /var/www/ipmanagement/frontend;
        try_files \$uri \$uri/ /index.html;
        
        # Gzip compression
        gzip on;
        gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    }

    # API proxy
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
```

### 7.2. Enable site
```bash
ln -s /etc/nginx/sites-available/ipmanagement /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

## Phần 8: Cấu hình Firewall

### 8.1. Cấu hình UFW
```bash
ufw allow 'Nginx Full'
ufw allow 22/tcp
ufw enable
```

---

## Phần 9: Cài đặt SSL với Let's Encrypt

### 9.1. Cài đặt Certbot
```bash
apt install -y certbot python3-certbot-nginx
```

### 9.2. Lấy SSL certificate
```bash
# Tạm thời disable redirect HTTP->HTTPS để lấy cert
# Sửa nginx config, comment dòng "return 301 https..."

certbot --nginx -d managerip.o.io
```

### 9.3. Test auto-renewal
```bash
certbot renew --dry-run
```

---

## Phần 10: Chạy Database Migrations

### 10.1. Chạy migrations
```bash
cd /var/www/ipmanagement/api
dotnet ef database update
```

---

## Phần 11: Kiểm tra deployment

### 11.1. Kiểm tra các service
```bash
systemctl status ipmanagement-api
systemctl status nginx
systemctl status postgresql
```

### 11.2. Kiểm tra logs
```bash
# API logs
journalctl -u ipmanagement-api -f

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 11.3. Test API
```bash
curl https://managerip.o.io/api/ipaddresses
```

### 11.4. Test Frontend
Mở trình duyệt: https://managerip.o.io

---

## Các vấn đề thường gặp

### 1. API không start
- Kiểm tra logs: `journalctl -u ipmanagement-api -f`
- Kiểm tra port 5001 có đang bị占用 không: `netstat -tlnp | grep 5001`

### 2. Database connection failed
- Kiểm tra connection string trong appsettings.Production.json
- Đảm bảo PostgreSQL đang chạy: `systemctl status postgresql`
- Kiểm tra firewall: `ufw status`

### 3. Nginx 502 Bad Gateway
- Kiểm tra API có đang chạy không
- Kiểm tra proxy_pass URL trong nginx config

### 4. Frontend không load được API
- Kiểm tra VITE_API_URL trong .env.production
- Kiểm tra CORS trong Program.cs (nếu có)

---

## Backup và Recovery

### Backup database
```bash
pg_dump -U ipmanagement IPManagementDB > backup_$(date +%Y%m%d).sql
```

### Restore database
```bash
psql -U ipmanagement IPManagementDB < backup_20240310.sql
```

---

## Monitoring

### Cài đặt PM2 cho .NET (optional)
```bash
npm install -g pm2
pm2 start /usr/bin/dotnet --name "ipmanagement-api" -- /var/www/ipmanagement/api/IPManagement.API.dll
pm2 save
pm2 startup