# Hướng Dẫn Cấu Hình Môi Trường

## Tổng Quan

Dự án sử dụng cấu hình tập trung cho cả frontend và backend, hỗ trợ 2 môi trường:
- **Development**: Môi trường phát triển local
- **Production**: Môi trường production

## Cách Chọn Môi Trường Chạy

### Frontend (IPManagement.Web - Vite/React)

Vite **tự động chọn** file `.env` dựa trên lệnh chạy:

| Lệnh chạy | File `.env` được load | Môi trường |
|-----------|----------------------|------------|
| `npm run dev` | `.env` | Development |
| `npm run build` | `.env.production` | Production |
| `npm run preview` | `.env.production` | Production (preview) |

**Không cần chỉnh sửa code** - Vite tự động load đúng file.

### Backend (IPManagement.API - .NET)

.NET sử dụng biến môi trường `ASPNETCORE_ENVIRONMENT`:

#### Cách 1: Sử dụng launchSettings.json (khuyến nghị cho development)

File `IPManagement.API/Properties/launchSettings.json` đã cấu hình sẵn profile Development. Khi chạy từ VS Code hoặc Visual Studio, profile này sẽ tự động được sử dụng.

#### Cách 2: Set biến môi trường thủ công

**Windows (cmd.exe):**
```cmd
set ASPNETCORE_ENVIRONMENT=Development
dotnet run
```

**Windows (PowerShell):**
```powershell
$env:ASPNETCORE_ENVIRONMENT="Development"
dotnet run
```

**Linux/Mac:**
```bash
export ASPNETCORE_ENVIRONMENT=Development
dotnet run
```

#### Cách 3: Docker

File `docker-compose.yml` đã cấu hình môi trường:
```yaml
environment:
  - ASPNETCORE_ENVIRONMENT=Development  # hoặc Production
```

## Frontend Configuration (IPManagement.Web)

### File Cấu Hình

| File | Môi Trường | Mô Tả |
|------|-----------|-------|
| `.env` | Development (local) | Cấu hình mặc định cho development |
| `.env.production` | Production | Cấu hình cho production |
| `.env.example` | Template | Template cho development |
| `.env.production.example` | Template | Template cho production |

### Biến Môi Trường

| Biến | Development | Production | Mô Tả |
|------|-------------|------------|-------|
| `VITE_API_URL` | `http://localhost:5001/api` | `https://ip.o.io/api` | Base URL của backend API |

## Backend Configuration (IPManagement.API)

### File Cấu Hình

| File | Môi Trường | Mô Tả |
|------|-----------|-------|
| `appsettings.json` | Default | Cấu hình chung |
| `appsettings.Development.json` | Development | Cấu hình cho development |
| `appsettings.Production.json` | Production | Cấu hình cho production |

### AppSettings

| Key | Development | Production | Mô Tả |
|-----|-------------|------------|-------|
| `AppSettings:BaseUrl` | `http://localhost:5001` | `https://ip.o.io` | Base URL của backend |
| `AppSettings:FrontendUrl` | `http://localhost:5173` | `https://ip.o.io` | Frontend URL cho CORS |

### Connection Strings

| Key | Development | Production | Mô Tả |
|-----|-------------|------------|-------|
| `ConnectionStrings:DefaultConnection` | Local PostgreSQL | Production PostgreSQL | Connection string database |

### JwtSettings

| Key | Development | Production | Mô Tả |
|-----|-------------|------------|-------|
| `JwtSettings:SecretKey` | Development key | Production key | Secret key cho JWT |
| `JwtSettings:Issuer` | `IPManagementAPI` | `IPManagementAPI` | JWT issuer |
| `JwtSettings:Audience` | `IPManagementClient` | `IPManagementClient` | JWT audience |

### Cách Sử Dụng

1. **Development**:
   ```bash
   # Chạy API (tự động sử dụng appsettings.Development.json)
   dotnet run
   ```

2. **Production**:
   ```bash
   # Set environment variable
   set ASPNETCORE_ENVIRONMENT=Production
   
   # Publish và chạy
   dotnet publish -c Release
   ```

## Tóm Tắt URL

| Môi Trường | Frontend | Backend |
|-----------|----------|---------|
| Development | `http://localhost:5173` | `http://localhost:5001` |
| Production | `https://ip.o.io` | `https://ip.o.io` |

## Chạy Với Docker

### Chuẩn Bị

1. **Tạo file `.env`** (dựa trên `.env.example`):
   ```bash
   cp .env.example .env
   ```

2. **Cấu hình biến môi trường trong `.env`**:
   ```env
   # Database
   DB_PASSWORD=MotMatKhauMatManh123!
   
   # JWT Settings
   JWT_SECRET_KEY mot-chuoi-bat-ky-it-nhat-32-ky-tu-dac-biet!
   ```

### Chạy Development

```bash
# Build và start tất cả services
docker-compose up -d --build

# Kiểm tra logs
docker-compose logs -f

# Dừng services
docker-compose down
```

### Chạy Production

1. **Cập nhật `.env.production`** với URL production:
   ```env
   VITE_API_URL=https://ip.o.io/api
   ```

2. **Cập nhật `appsettings.Production.json`**:
   ```json
   {
     "AppSettings": {
       "BaseUrl": "https://ip.o.io",
       "FrontendUrl": "https://ip.o.io"
     }
   }
   ```

3. **Build và chạy**:
   ```bash
   docker-compose up -d --build
   ```

### Docker Compose Configuration

File `docker-compose.yml` đã cấu hình sẵn:
- `ASPNETCORE_ENVIRONMENT: Production` cho API container
- PostgreSQL database
- Nginx reverse proxy cho HTTPS

### Kiểm Tra Services

```bash
# Xem trạng thái services
docker-compose ps

# Xem logs của API
docker-compose logs api

# Xem logs của Frontend
docker-compose logs frontend

# Xem logs của Nginx
docker-compose logs nginx
```

## Lưu Ý

1. **Không commit file `.env` thực tế** (chỉ commit `.env.example`)
2. **Bảo mật thông tin nhạy cảm**: Secret keys, passwords, connection strings
3. **Cập nhật CORS**: Khi thay đổi frontend URL, nhớ cập nhật `AppSettings:FrontendUrl` trong backend
4. **SSL/HTTPS**: Production bắt buộc sử dụng HTTPS

## Kiểm Tra Cấu Hình

### Frontend
```bash
# Kiểm tra biến môi trường
cat .env
cat .env.production
```

### Backend
```bash
# Kiểm tra file cấu hình
cat IPManagement.API/appsettings.json
cat IPManagement.API/appsettings.Development.json
cat IPManagement.API/appsettings.Production.json