# Hướng Dẫn Cấu Hình Triển Khai

## Tổng Quan

Dự án sử dụng cấu hình tập trung để dễ dàng triển khai trên các môi trường khác nhau (development, production).

## Backend Configuration (ASP.NET Core)

### File Cấu Hình

Backend sử dụng các file cấu hình sau:

1. **`appsettings.json`** - Cấu hình mặc định cho tất cả môi trường
2. **`appsettings.Development.json`** - Cấu hình cho môi trường development
3. **`appsettings.Production.json`** - Cấu hình cho môi trường production

### Các Tham Số Quan Trọng

#### AppSettings

```json
{
  "AppSettings": {
    "BaseUrl": "http://localhost:5001",
    "FrontendUrl": "http://localhost:5173"
  }
}
```

- **`BaseUrl`**: URL của backend API
- **`FrontendUrl`**: URL của frontend (có thể nhiều URL cách nhau bằng dấu phẩy)

#### JwtSettings

```json
{
  "JwtSettings": {
    "SecretKey": "your-256-bit-secret-key-must-be-long-enough-for-security",
    "Issuer": "IPManagementAPI",
    "Audience": "IPManagementClient",
    "AccessTokenExpirationMinutes": 60,
    "RefreshTokenExpirationDays": 7
  }
}
```

#### ConnectionStrings

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=IPManagementDB;Username=postgres;Password=your_password"
  }
}
```

### Cấu Hình Cho Production

1. Chỉnh sửa `appsettings.Production.json`:
   - Thay đổi `ConnectionStrings:DefaultConnection` với thông tin database thực
   - Thay đổi `JwtSettings:SecretKey` với key bí mật mạnh (ít nhất 256-bit)
   - Thay đổi `AppSettings:BaseUrl` và `AppSettings:FrontendUrl` với domain của bạn

2. Set environment variable `ASPNETCORE_ENVIRONMENT=Production`

## Frontend Configuration (React + Vite)

### File Cấu Hình

Frontend sử dụng file `.env` để cấu hình:

1. **`.env`** - Cấu hình development
2. **`.env.production`** - Cấu hình production
3. **`.env.example`** - Template cho development
4. **`.env.production.example`** - Template cho production

### Các Tham Số Quan Trọng

```env
VITE_API_URL=http://localhost:5001/api
```

- **`VITE_API_URL`**: URL của backend API (bao gồm `/api` ở cuối)

### Cấu Hình Cho Production

1. Tạo file `.env.production` từ `.env.production.example`:
   ```bash
   cp .env.production.example .env.production
   ```

2. Chỉnh sửa `.env.production`:
   ```env
   VITE_API_URL=https://yourdomain.com/api
   ```

3. Build frontend:
   ```bash
   npm run build
   ```

## Ví Dụ Triển Khai

### Development

```bash
# Backend
cd IPManagement.API
dotnet run

# Frontend
cd IPManagement.Web
npm run dev
```

### Production

#### Backend

```bash
# Set environment
export ASPNETCORE_ENVIRONMENT=Production

# Run with production settings
dotnet run --configuration Release
```

#### Frontend

```bash
# Ensure .env.production exists with correct values
npm run build

# Deploy dist/ folder to web server
```

## Sử Dụng Environment Variables (Khuyến Nghị Cho Production)

Thay vì lưu cấu hình trong file, bạn có thể sử dụng environment variables:

### Backend

```bash
# Override AppSettings
export AppSettings__BaseUrl=https://yourdomain.com
export AppSettings__FrontendUrl=https://yourdomain.com

# Override ConnectionStrings
export ConnectionStrings__DefaultConnection="Host=your-db-host;Port=5432;Database=IPManagementDB;Username=user;Password=secret"

# Override JwtSettings
export JwtSettings__SecretKey="your-production-secret-key"
```

### Frontend

```bash
# Override API URL
export VITE_API_URL=https://yourdomain.com/api

# Build
npm run build
```

## Kiểm Tra Cấu Hình

### Backend

Sau khi start backend, kiểm tra log để xác nhận:
- CORS policy đã load đúng frontend URLs
- Database connection thành công
- JWT settings đã được load

### Frontend

Sau khi build, kiểm tra:
- File `.env.production` có đúng giá trị không
- Build thành công không có lỗi
- API calls đến đúng endpoint

## Lưu Ý Bảo Mật

1. **Không commit** các file `.env` chứa thông tin nhạy cảm
2. **Luôn sử dụng** `*.example` files làm template
3. **Sử dụng** environment variables cho production secrets
4. **Rotate** JWT SecretKey định kỳ
5. **Sử dụng HTTPS** cho production