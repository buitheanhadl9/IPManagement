# Hướng Dẫn Triển Khai IPManagement Trên Debian

## Thông Tin Hệ Thống

- **Backend**: ASP.NET Core 9.0 Web API
- **Frontend**: React 18 + TypeScript + Vite
- **Database**: PostgreSQL 15+
- **Web Server**: Nginx
- **OS**: Debian 11/12

---

## Phần 1: Chuẩn Bị Server

### 1.1. Kết nối SSH vào server

```bash
ssh root@your-server-ip
```

### 1.2. Cập nhật hệ thống

```bash
apt update && apt upgrade -y
```

### 1.3. Cài đặt các package cần thiết

```bash
apt install -y git curl wget nginx ufw ca-certificates gnupg
```

### 1.4. Cấu hình firewall (UFW)

```bash
# Cho phép SSH
ufw allow OpenSSH

# Cho phép HTTP và HTTPS
ufw allow 'Nginx Full'

# Bật firewall
ufw enable
ufw status
```

---

## Phần 2: Cài Đặt .NET SDK 9.0

### 2.1. Thêm Microsoft package repository

```bash
# Cài đặt packages cần thiết
apt install -y apt-transport-https

# Thêm Microsoft GPG key
wget https://packages.microsoft.com/config/debian/12/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
dpkg -i packages-microsoft-prod.deb
rm packages-microsoft-prod.deb
```

### 2.2. Cập nhật và cài đặt .NET 9.0 SDK

```bash
apt update
apt install -y dotnet-sdk-9.0
```

### 2.3. Kiểm tra cài đặt

```bash
dotnet --version
```

---

## Phần 3: Cài Đặt PostgreSQL

### 3.1. Thêm PostgreSQL repository

```bash
# Cài đặt các package cần thiết
apt install -y gnupg postgresql-common

# Thêm GPG key
sh /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh

# Cài đặt PostgreSQL 16
apt install -y postgresql-16 postgresql-contrib-16
```

### 3.2. Khởi động và enable PostgreSQL

```bash
systemctl start postgresql
systemctl enable postgresql
systemctl status postgresql
```

### 3.3. Tạo database và user

```bash
# Đăng nhập vào PostgreSQL
sudo -u postgres psql
```

Trong PostgreSQL shell, chạy các lệnh sau:

```sql
-- Tạo database
CREATE DATABASE "IPManagementDB";

-- Tạo user
CREATE USER "ipmanagement" WITH PASSWORD 'YourStrongPassword!';

-- Cấp quyền
GRANT ALL PRIVILEGES ON DATABASE "IPManagementDB" TO "ipmanagement";

-- Thoát
\q
```

### 3.4. Cấu hình PostgreSQL cho remote access (nếu cần)

Sửa file `/etc/postgresql/16/main/pg_hba.conf`:

```bash
nano /etc/postgresql/16/main/pg_hba.conf
```

Thêm dòng sau vào cuối file:

```
host    IPManagementDB    ipmanagement    your-server-ip/32    md5
```

Sửa file `/etc/postgresql/16/main/postgresql.conf`:

```bash
nano /etc/postgresql/16/main/postgresql.conf
```

Tìm và sửa:

```
listen_addresses = '*'
```

Khởi động lại PostgreSQL:

```bash
systemctl restart postgresql
```

---

## Phần 4: Cấu Hình Backend API

### 4.1. Tạo thư mục cho ứng dụng

```bash
mkdir -p /var/www/ipmanagement
cd /var/www/ipmanagement
```

### 4.2. Clone code từ GitHub

Clone code từ nhánh "ngày-25-thang-3-nam-2026" (commit: hoàn thiện phần quản lý đơn vị và quản lý ip):

```bash
# Clone từ GitHub
git clone https://github.com/buitheanhadl9/IPManagement-branch.git .

# Checkout nhánh cụ thể
git checkout ngày-25-thang-3-nam-2026

# Hoặc clone trực tiếp nhánh
git clone -b ngày-25-thang-3-nam-2026 https://github.com/buitheanhadl9/IPManagement-branch.git .
```

**Thông tin commit:**
- **Branch**: `ngày-25-thang-3-nam-2026`
- **Mô tả commit**: Hoàn thiện phần quản lý đơn vị và quản lý IP

### 4.3. Cấu hình connection string

Tạo file `appsettings.Production.json`:

```bash
nano /var/www/ipmanagement/IPManagement.API/appsettings.Production.json
```

Nội dung file:

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=IPManagementDB;Username=ipmanagement;Password=YourStrongPassword!"
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
```

### 4.4. Restore packages và build

```bash
cd /var/www/ipmanagement/IPManagement.API
dotnet restore
dotnet build -c Release
```

### 4.5. Migrate database

```bash
dotnet ef database update --connection "Host=localhost;Port=5432;Database=IPManagementDB;Username=ipmanagement;Password=YourStrongPassword!"
```

### 4.6. Tạo thư mục uploads

```bash
mkdir -p /var/www/ipmanagement/IPManagement.API/uploads/drawings
chmod -R 755 /var/www/ipmanagement/IPManagement.API/uploads
```

### 4.7. Tạo systemd service cho backend

Tạo file service:

```bash
nano /etc/systemd/system/ipmanagement-api.service
```

Nội dung file:

```ini
[Unit]
Description=IPManagement API
After=network.target postgresql.service

[Service]
Type=notify
WorkingDirectory=/var/www/ipmanagement/IPManagement.API
ExecStart=/usr/bin/dotnet /var/www/ipmanagement/IPManagement.API/IPManagement.API.dll
Configuration=Production
Restart=always
RestartSec=10
SyslogIdentifier=ipmanagement-api
User=www-data
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=DOTNET_PRINT_TELEMETRY_MESSAGE=false

[Install]
WantedBy=multi-user.target
```

Reload systemd và start service:

```bash
systemctl daemon-reload
systemctl enable ipmanagement-api
systemctl start ipmanagement-api
systemctl status ipmanagement-api
```

---

## Phần 5: Cấu Hình Frontend

### 5.1. Cài đặt Node.js

```bash
# Thêm Node.js repository
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -

# Cài đặt Node.js
apt install -y nodejs
```

### 5.2. Cấu hình frontend

```bash
cd /var/www/ipmanagement/IPManagement.Web
```

Tạo file `.env.production`:

```bash
nano .env.production
```

Nội dung file:

```
VITE_API_URL=https://ip.o.io/api
```

### 5.3. Build frontend

```bash
npm install
npm run build
```

Output sẽ được tạo tại thư mục `dist/`.

---

## Phần 6: Cấu Hình Nginx

### 6.1. Tạo cấu hình Nginx

```bash
nano /etc/nginx/sites-available/ipmanagement
```

Nội dung file:

```nginx
server {
    listen 80;
    server_name ip.o.io www.ip.o.io;

    # Redirect HTTP to HTTPS (nếu có SSL)
    # return 301 https://$server_name$request_uri;

    # Frontend
    location / {
        root /var/www/ipmanagement/IPManagement.Web/dist;
        try_files $uri $uri/ /index.html;
        
        # Gzip compression
        gzip on;
        gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SignalR Hub
    location /NotificationHub {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Uploads
    location /uploads {
        alias /var/www/ipmanagement/IPManagement.API/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### 6.2. Enable site và restart Nginx

```bash
# Tạo symlink
ln -s /etc/nginx/sites-available/ipmanagement /etc/nginx/sites-enabled/

# Remove site mặc định
rm /etc/nginx/sites-enabled/default

# Test cấu hình
nginx -t

# Restart Nginx
systemctl restart nginx
systemctl enable nginx
```

---

## Phần 7: Cấu Hình SSL (HTTPS)

### 7.1. Cài đặt Certbot

```bash
apt install -y certbot python3-certbot-nginx
```

### 7.2. Cấp chứng chỉ SSL

```bash
certbot --nginx -d ip.o.io -d www.ip.o.io
```

Làm theo hướng dẫn của Certbot để nhập email và đồng ý với điều khoản.

### 7.3. Tự động renew SSL

Certbot đã tự động cấu hình cron job để renew SSL. Kiểm tra:

```bash
certbot renew --dry-run
```

---

## Phần 8: Kiểm Tra Hệ Thống

### 8.1. Kiểm tra trạng thái các service

```bash
systemctl status ipmanagement-api
systemctl status nginx
systemctl status postgresql
```

### 8.2. Kiểm tra log

```bash
# Backend log
journalctl -u ipmanagement-api -f

# Nginx log
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 8.3. Truy cập ứng dụng

- **Frontend**: `https://ip.o.io`
- **API**: `https://ip.o.io/api`
- **Swagger**: `https://ip.o.io/swagger`

---

## Phần 9: Các Lệnh Quản Lý

### 9.1. Backend

```bash
# Start
systemctl start ipmanagement-api

# Stop
systemctl stop ipmanagement-api

# Restart
systemctl restart ipmanagement-api

# Xem log
journalctl -u ipmanagement-api -f

# Disable
systemctl disable ipmanagement-api
```

### 9.2. Frontend (Rebuild)

```bash
cd /var/www/ipmanagement/IPManagement.Web
npm install
npm run build
systemctl restart nginx
```

### 9.3. Database Backup

```bash
# Backup database
pg_dump -U ipmanagement -h localhost IPManagementDB > backup.sql

# Restore database
psql -U ipmanagement -h localhost IPManagementDB < backup.sql
```

---

## Vấn Đề Thường Gặp

### 1. Backend không start được

Kiểm tra log:
```bash
journalctl -u ipmanagement-api -f
```

Kiểm tra connection string trong `appsettings.Production.json`.

### 2. Frontend không load được

Kiểm tra:
- File `dist/` đã được build chưa
- Cấu hình Nginx có đúng không
- Log Nginx: `/var/log/nginx/error.log`

### 3. Database connection failed

Kiểm tra:
- PostgreSQL đang chạy: `systemctl status postgresql`
- Connection string đúng
- User và database đã được tạo

### 4. Upload files không hoạt động

Kiểm tra quyền thư mục:
```bash
chmod -R 755 /var/www/ipmanagement/IPManagement.API/uploads
chown -R www-data:www-data /var/www/ipmanagement/IPManagement.API/uploads
```

---

## Tóm Tắt Các Bước

| Bước | Mô Tả | Lệnh Chính |
|------|-------|------------|
| 1 | Cập nhật hệ thống | `apt update && apt upgrade` |
| 2 | Cài .NET SDK | `apt install dotnet-sdk-9.0` |
| 3 | Cài PostgreSQL | `apt install postgresql-16` |
| 4 | Tạo database | `CREATE DATABASE IPManagementDB` |
| 5 | Build backend | `dotnet build -c Release` |
| 6 | Migrate DB | `dotnet ef database update` |
| 7 | Tạo systemd service | `nano /etc/systemd/system/ipmanagement-api.service` |
| 8 | Build frontend | `npm run build` |
| 9 | Cấu hình Nginx | `nano /etc/nginx/sites-available/ipmanagement` |
| 10 | Cài SSL | `certbot --nginx` |

---

## File Cần Chuẩn Bị

1. `IPManagement.API/appsettings.Production.json` - Connection string production
2. `IPManagement.Web/.env.production` - API URL cho frontend
3. `/etc/systemd/system/ipmanagement-api.service` - Systemd service
4. `/etc/nginx/sites-available/ipmanagement` - Nginx configuration

---

## Bảo Mật

1. **Thay đổi password PostgreSQL** thành password mạnh
2. **Sử dụng HTTPS** với SSL certificate
3. **Cấu hình firewall** chỉ mở port 80, 443
4. **Cập nhật hệ thống** thường xuyên
5. **Backup database** định kỳ
6. **Sử dụng environment variables** cho sensitive data
