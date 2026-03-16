# Hướng dẫn triển khai tính năng Quản lý bản vẽ

## Tổng quan

Hướng dẫn này mô tả các bước để triển khai tính năng quản lý bản vẽ cho đơn vị trong hệ thống IP Management.

## Các bước triển khai

### 1. Chạy Database Migration

Sử dụng SQL script đã được tạo tại `IPManagement.API/Migrations/20260315_DrawingTable.sql`:

```bash
# Kết nối đến database PostgreSQL
psql -h localhost -U postgres -d IPManagementDB

# Chạy script migration
\i IPManagement.API/Migrations/20260315_DrawingTable.sql
```

Hoặc sử dụng Entity Framework Core CLI:

```bash
cd IPManagement.API
dotnet ef migrations add AddDrawingTable
dotnet ef database update
```

### 2. Cấu hình File Storage

Đã được cấu hình trong `appsettings.json`:

```json
{
  "FileStorage": {
    "DrawingUploadPath": "uploads/drawings",
    "MaxFileSize": 52428800,
    "AllowedExtensions": [".pdf", ".dwg", ".png", ".jpg", ".jpeg", ".vsdx"]
  }
}
```

### 3. Cấu hình Docker

Đã cập nhật `docker-compose.yml` với volume cho uploads:

```yaml
volumes:
  uploads_data:
```

### 4. Cấu hình Nginx

Đã thêm location block trong `nginx.conf`:

```nginx
location /uploads/ {
    alias /app/uploads/;
    expires 30d;
    add_header Cache-Control "public, immutable";
    add_header Access-Control-Allow-Origin "*";
}
```

### 5. Deploy lại hệ thống

```bash
# Build và chạy lại các services
docker-compose down
docker-compose up -d --build

# Kiểm tra logs
docker-compose logs -f api
docker-compose logs -f nginx
```

### 6. Cấp quyền cho người dùng

Cần cấp quyền `drawing:create`, `drawing:view`, `drawing:update`, `drawing:delete` cho các role phù hợp thông qua giao diện quản lý quyền.

## Kiểm tra

### Backend API

1. **Upload drawing**: `POST /api/drawings/upload`
2. **List drawings**: `GET /api/drawings/unit/{unitId}`
3. **Download drawing**: `GET /api/drawings/{id}/download`
4. **Preview drawing**: `GET /api/drawings/{id}/preview`

### Frontend

1. Truy cập trang chi tiết đơn vị
2. Scroll xuống phần "Quản lý bản vẽ"
3. Click "Upload bản vẽ" để tải file lên
4. Click "Tải" để download file
5. Click "Xem" để preview (chỉ cho PDF, PNG, JPG)

## Định dạng file được hỗ trợ

| Định dạng | Upload | Download | Preview |
|-----------|--------|----------|---------|
| PDF | ✅ | ✅ | ✅ |
| DWG | ✅ | ✅ | ❌ |
| PNG | ✅ | ✅ | ✅ |
| JPG | ✅ | ✅ | ✅ |
| VSDX | ✅ | ✅ | ❌ |

## Giới hạn

- Kích thước file tối đa: 50MB
- Định dạng file: PDF, DWG, PNG, JPG, VSDX
- Preview chỉ hỗ trợ PDF, PNG, JPG

## Lưu ý

1. Thư mục uploads sẽ được lưu trong Docker volume `uploads_data`
2. Để backup dữ liệu, cần backup cả database và Docker volume
3. Preview file DWG và VSDX không được hỗ trợ (chỉ download)
4. Đảm bảo có đủ quyền phân quyền để sử dụng tính năng