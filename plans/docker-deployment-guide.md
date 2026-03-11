# Hướng dẫn triển khai IPManagement với Docker

## Tại sao nên dùng Docker?

✅ **Dễ dàng triển khai** - Chỉ cần 1 lệnh để start toàn bộ ứng dụng
✅ **Nhất quán** - Môi trường development = production
✅ **Isolation** - Mỗi service chạy trong container riêng
✅ **Dễ scale** - Có thể mở rộng từng service độc lập
✅ **Dễ backup** - Data được lưu trong volumes

---

## Phần 1: Chuẩn bị server

### 1.1. Kết nối SSH vào server
```bash
ssh root@managerip.o.io
```

### 1.2. Cài đặt Docker
```bash
# Update package index
apt update

# Install prerequisites
apt install -y apt-transport-https ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] \
https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
apt update
apt install -y docker-ce docker-ce-cli containerd.io

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Verify installation
docker --version
```

### 1.3. Cài đặt Docker Compose
```bash
# Install Docker Compose plugin
apt install -y docker-compose-plugin

# Verify installation
docker compose version
```

### 1.4. (Optional) Cho phép user không dùng sudo
```bash
usermod -aG docker $USER
# Log out và log in lại để áp dụng
```

---

## Phần 2: Clone và cấu hình project

### 2.1. Clone repository
```bash
cd /var/www
git clone https://github.com/buitheanhadl9/IPManagement.git
cd IPManagement
git checkout feature/ngay7thang3
```

### 2.2. Tạo file .env
```bash
cp .env.example .env
nano .env
```

Sửa các giá trị:
```env
# Database - ĐỔI PASSWORD NÀY!
DB_PASSWORD=YourStrongPasswordHere123!

# JWT Secret - ĐỔI KEY NÀY!
JWT_SECRET_KEY=YourVeryLongSecretKeyHereAtLeast32Characters!
```

### 2.3. Tạo directory cho SSL certificates
```bash
mkdir -p nginx/ssl
```

---

## Phần 3: Cài đặt SSL Certificate

### 3.1. Lấy SSL từ Let's Encrypt

```bash
# Temporarily stop any service using port 80
# (We'll use Docker later, so skip if nothing is running)

# Get certificate
apt install -y certbot
certbot certonly --standalone -d managerip.o.io --agree-tos --email your-email@example.com

# Copy certificates to nginx/ssl directory
cp /etc/letsencrypt/live/managerip.o.io/fullchain.pem nginx/ssl/
cp /etc/letsencrypt/live/managerip.o.io/privkey.pem nginx/ssl/

# Set proper permissions
chmod 600 nginx/ssl/privkey.pem
chmod 644 nginx/ssl/fullchain.pem
```

### 3.2. (Alternative) Self-signed certificate (cho testing)

```bash
cd nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout privkey.pem \
  -out fullchain.pem \
  -subj "/CN=managerip.o.io"
```

---

## Phần 4: Build và start containers

### 4.1. Build Docker images
```bash
docker compose build
```

### 4.2. Start containers
```bash
docker compose up -d
```

### 4.3. Kiểm tra status
```bash
docker compose ps
```

Output mong đợi:
```
NAME                   STATUS         PORTS
ipmanagement-postgres  Up (healthy)   5432/tcp
ipmanagement-api       Up             8080/tcp
ipmanagement-frontend  Up             80/tcp
ipmanagement-nginx     Up             0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

---

## Phần 5: Chạy database migrations

### 5.1. Vào container API
```bash
docker compose exec api dotnet ef database update
```

### 5.2. (Alternative) Build và chạy migration locally
```bash
# Build migration tool
docker compose exec api dotnet tool install --global dotnet-ef

# Run migration
docker compose exec api /root/.dotnet/tools/dotnet ef database update
```

---

## Phần 6: Kiểm tra deployment

### 6.1. Kiểm tra logs
```bash
# Xem tất cả logs
docker compose logs -f

# Xem logs riêng từng service
docker compose logs -f api
docker compose logs -f frontend
docker compose logs -f postgres
docker compose logs -f nginx
```

### 6.2. Test API
```bash
curl https://managerip.o.io/api/ipaddresses
```

### 6.3. Test Frontend
Mở trình duyệt: https://managerip.o.io

---

## Phần 7: Maintenance commands

### 7.1. Restart services
```bash
docker compose restart
```

### 7.2. Stop services
```bash
docker compose down
```

### 7.3. Stop và remove volumes (CAREFUL: sẽ mất data!)
```bash
docker compose down -v
```

### 7.4. Update code và rebuild
```bash
git pull
docker compose build
docker compose up -d
```

### 7.5. Backup database
```bash
docker compose exec postgres pg_dump -U ipmanagement IPManagementDB > backup_$(date +%Y%m%d).sql
```

### 7.6. Restore database
```bash
cat backup_20240310.sql | docker compose exec -T postgres psql -U ipmanagement -d IPManagementDB
```

---

## Phần 8: Auto-renewal SSL

### 8.1. Tạo script renew
```bash
cat > /usr/local/bin/renew-ssl.sh << 'EOF'
#!/bin/bash
certbot renew
docker cp /etc/letsencrypt/live/managerip.o.io/fullchain.pem ipmanagement-nginx:/etc/ssl/certs/fullchain.pem
docker cp /etc/letsencrypt/live/managerip.o.io/privkey.pem ipmanagement-nginx:/etc/ssl/private/privkey.pem
docker restart ipmanagement-nginx
EOF
chmod +x /usr/local/bin/renew-ssl.sh
```

### 8.2. Thêm vào crontab
```bash
crontab -e
# Thêm dòng này để renew mỗi tháng 1 lần
0 0 1 * * /usr/local/bin/renew-ssl.sh
```

---

## Troubleshooting

### 1. Container không start
```bash
# Kiểm tra logs
docker compose logs api

# Kiểm tra port có bị占用 không
netstat -tlnp | grep 80
netstat -tlnp | grep 443
```

### 2. Database connection failed
```bash
# Kiểm tra postgres container
docker compose ps postgres

# Vào container postgres và kiểm tra
docker compose exec postgres psql -U ipmanagement -d IPManagementDB
```

### 3. API không kết nối được database
```bash
# Kiểm tra environment variables
docker compose exec api env | grep ConnectionString

# Test kết nối từ API container
docker compose exec api ping postgres
```

### 4. Frontend không load được API
- Kiểm tra `VITE_API_URL` trong `.env.production`
- Kiểm tra nginx config proxy_pass

### 5. SSL certificate error
```bash
# Kiểm tra certificate
openssl s_client -connect managerip.o.io:443

# Renew certificate
certbot renew --force-renewal
```

---

## So sánh: Docker vs Manual Deployment

| Aspect | Docker | Manual |
|--------|--------|--------|
| Setup time | ~10 phút | ~30 phút |
| Consistency | 100% | Phụ thuộc environment |
| Rollback | Dễ (docker-compose down) | Khó |
| Backup | Dễ (volumes) | Thủ công |
| Scaling | Dễ dàng | Phức tạp |
| Learning curve | Cần học Docker | Không cần |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Internet                             │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│              Nginx Container (80, 443)                  │
│              - SSL Termination                          │
│              - Reverse Proxy                            │
└───────────┬───────────────────────────────┬─────────────┘
            │                               │
            ▼                               ▼
┌───────────────────────┐       ┌───────────────────────┐
│  Frontend Container   │       │    API Container      │
│  (Nginx, port 80)     │       │  (.NET, port 8080)    │
└───────────────────────┘       └───────────┬───────────┘
                                            │
                                            ▼
                                  ┌───────────────────────┐
                                  │  PostgreSQL Container │
                                  │  (port 5432)          │
                                  │  (Volume: postgres_   │
                                  │   data)               │
                                  └───────────────────────┘