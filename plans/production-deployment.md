# Hướng Dẫn Triển Khai - IPManagement

## Development Mode (Phát Triển)

### Cách 1: Hot Reload (Khuyến nghị - Tiện lợi nhất)
Frontend và Backend sẽ tự động reload khi bạn sửa code:

```powershell
.\deploy-dev-hotreload.ps1
```

**URL truy cập:**
- Frontend Dev: http://localhost:5173 (với hot reload)
- API: http://localhost:5001
- Nginx Proxy: http://localhost

### Cách 2: Build & Run (Không có hot reload)
```powershell
.\deploy-dev.ps1
```

### Cách 3: Docker Compose Command
```powershell
# Hot reload mode
docker-compose -f docker-compose.dev.yml --env-file .env up -d

# Normal build mode
docker-compose --env-file .env up -d --build
```

## Production Mode (Triển Khai Thực Tế)

### Cách 1: Dùng Script (Khuyến nghị - Dễ dàng nhất)
```powershell
.\deploy-production.ps1
```

### Cách 2: Dùng Docker Compose Command Trực Tiếp
```powershell
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

**URL truy cập:** https://managerip.o.io

**Lưu ý**: Bạn phải **chỉ định file `docker-compose.prod.yml`** khi deploy production. Hệ thống sẽ không tự động chọn.

## Yêu Cầu

1. **Docker Desktop** đã cài đặt và chạy
2. **Domain** đã trỏ về server (managerip.o.io)
3. **SSL Certificate** đã được cấp (Let's Encrypt hoặc certificate khác)

## Cấu Hình SSL

### Option 1: Sử dụng Let's Encrypt (Khuyến nghị)

```bash
# Tạo thư mục chứa certificate
mkdir -p nginx/ssl

# Cấp chứng chỉ Let's Encrypt (chạy trên host)
docker run --rm -v $(pwd)/nginx/ssl:/etc/letsencrypt certbot/certbot certonly --standalone -d managerip.o.io --email your-email@example.com --agree-tos --no-eff-email
```

Sau khi có certificate, copy files vào đúng vị trí:
- `nginx/ssl/fullchain.pem` - Certificate chain
- `nginx/ssl/privkey.pem` - Private key

### Option 2: Sử dụng Certificate tự ký (Cho testing)

```bash
# Tạo certificate tự ký
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/privkey.pem \
  -out nginx/ssl/fullchain.pem \
  -subj "/CN=managerip.o.io"
```

## Cấu Hình Environment Variables

### Bước 1: Tạo file .env.production

Copy file `.env.production.example` thành `.env.production` và cập nhật:

```bash
# Database
DB_PASSWORD=MậtKhẩuRấtMạnhCủaBạn

# JWT Secret Key - Phải ít nhất 32 ký tự
JWT_SECRET_KEY=YourVeryLongProductionSecretKeyHereAtLeast32Characters!

# Production Domain
PRODUCTION_DOMAIN=managerip.o.io
```

### Bước 2: Xác minh file cấu hình

Kiểm tra các file sau đã tồn tại:
- `.env.production` - Environment variables
- `nginx/nginx.prod.conf` - Nginx config cho production
- `nginx/ssl/fullchain.pem` - SSL certificate
- `nginx/ssl/privkey.pem` - SSL private key

## Triển Khai

### Command để build và start production:

```bash
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

### Kiểm tra trạng thái containers:

```bash
docker-compose -f docker-compose.prod.yml ps
```

### Xem logs:

```bash
# Tất cả logs
docker-compose -f docker-compose.prod.yml logs -f

# Chỉ API logs
docker-compose -f docker-compose.prod.yml logs -f api

# Chỉ frontend logs
docker-compose -f docker-compose.prod.yml logs -f frontend
```

## Dừng Và Clean

### Dừng containers:

```bash
docker-compose -f docker-compose.prod.yml down
```

### Dừng và xóa volumes (cẩn thận - sẽ mất dữ liệu database):

```bash
docker-compose -f docker-compose.prod.yml down -v
```

## Cập Nhật Application

### Pull code mới và rebuild:

```bash
git pull origin main
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

### Chỉ rebuild mà không rebuild lại images:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Kiểm tra port đang listen:

```bash
netstat -ano | findstr :80
netstat -ano | findstr :443
```

### Kiểm tra container health:

```bash
docker ps
```

### Restart một service cụ thể:

```bash
docker-compose -f docker-compose.prod.yml restart api
```

### Truy cập vào container:

```bash
# Vào frontend container
docker exec -it ipmanagement-frontend sh

# Vào API container
docker exec -it ipmanagement-api sh
```

## Cấu Hình Firewall

Đảm bảo các ports sau đã mở:
- **Port 80** (HTTP) - Cho redirect và Let's Encrypt challenge
- **Port 443** (HTTPS) - Cho HTTPS traffic

## Backup Database

### Backup:

```bash
docker exec ipmanagement-postgres pg_dump -U ipmanagement IPManagementDB > backup.sql
```

### Restore:

```bash
docker exec -i ipmanagement-postgres psql -U ipmanagement IPManagementDB < backup.sql
```

## Security Best Practices

1. **Luôn sử dụng HTTPS** trong production
2. **Không commit** file `.env.production` lên git
3. **Thay đổi** JWT_SECRET_KEY thành giá trị ngẫu nhiên, mạnh
4. **Cập nhật** Docker images thường xuyên
5. **Sử dụng** strong password cho database
6. **Enable** firewall rules chỉ cho ports 80 và 443