# IP Management System

Hệ thống quản lý địa chỉ IP với backend ASP.NET Core 9.0 và frontend React 18 + TypeScript.

## Tính năng

- **Quản lý người dùng**: Phân quyền Admin, Unit Admin, User
- **Quản lý đơn vị**: Hỗ trợ cấu trúc phân cấp (parent-child)
- **Quản lý IP**: Thêm, sửa, xóa địa chỉ IP theo đơn vị
- **Phân quyền**: User chỉ xem/sửa IP của đơn vị mình, Admin có toàn quyền
- **Audit Log**: Ghi lại lịch sử thay đổi

## Tech Stack

### Backend
- ASP.NET Core 9.0 Web API
- Entity Framework Core 9.0
- PostgreSQL
- ASP.NET Identity (Authentication & Authorization)
- JWT Tokens

### Frontend
- React 18 + TypeScript
- Redux Toolkit
- React Router v6
- Ant Design UI
- Axios

## Cấu trúc dự án

```
IPManagement/
├── IPManagement.API/          # Backend ASP.NET Core
│   ├── Controllers/           # API endpoints
│   ├── Models/                # Entity models
│   ├── Data/                  # DbContext
│   ├── Services/              # Business logic
│   └── DTOs/                  # Data transfer objects
└── IPManagement.Web/          # Frontend React
    ├── src/
    │   ├── components/        # Reusable components
    │   ├── layouts/           # Layout components
    │   ├── pages/             # Page components
    │   ├── services/          # API services
    │   ├── store/             # Redux store
    │   └── types/             # TypeScript types
```

## Cài đặt

### Yêu cầu
- .NET 9.0 SDK
- Node.js 18+
- PostgreSQL 15+

### Backend

1. Cấu hình connection string trong `IPManagement.API/appsettings.json`:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=ipmanagement;Username=postgres;Password=yourpassword"
  }
}
```

2. Restore packages và migrate database:
```bash
cd IPManagement.API
dotnet restore
dotnet ef database update
```

3. Chạy backend:
```bash
dotnet run
```

Backend sẽ chạy tại: `http://localhost:5000`

### Frontend

1. Cài đặt dependencies:
```bash
cd IPManagement.Web
npm install
```

2. Cấu hình API URL trong `.env`:
```
VITE_API_URL=http://localhost:5000/api
```

3. Chạy frontend:
```bash
npm run dev
```

Frontend sẽ chạy tại: `http://localhost:5173`

## Tài khoản mặc định

Sau khi migrate database, tạo tài khoản admin:

```bash
cd IPManagement.API
dotnet run -- --seed
```

Hoặc tạo thủ công qua API.

## API Endpoints

### Authentication
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/refresh-token` - Làm mới token

### IP Addresses
- `GET /api/ip-addresses` - Lấy danh sách IP (có phân trang, lọc)
- `GET /api/ip-addresses/{id}` - Lấy chi tiết IP
- `POST /api/ip-addresses` - Tạo IP mới
- `PUT /api/ip-addresses/{id}` - Cập nhật IP
- `DELETE /api/ip-addresses/{id}` - Xóa IP

### Units
- `GET /api/units` - Lấy danh sách đơn vị
- `GET /api/units/tree` - Lấy cây đơn vị
- `POST /api/units` - Tạo đơn vị mới
- `PUT /api/units/{id}` - Cập nhật đơn vị
- `DELETE /api/units/{id}` - Xóa đơn vị

### Users
- `GET /api/users` - Lấy danh sách người dùng (Admin only)
- `GET /api/users/{id}` - Lấy chi tiết người dùng
- `POST /api/users` - Tạo người dùng mới
- `PUT /api/users/{id}` - Cập nhật người dùng
- `DELETE /api/users/{id}` - Xóa người dùng

## Phân quyền

| Role | IP Addresses | Units | Users |
|------|-------------|-------|-------|
| Admin | Full access | Full access | Full access |
| Unit Admin | CRUD own unit + children | CRUD own unit + children | View own unit |
| User | View own unit | View own unit | View own unit |

## Build

### Backend
```bash
cd IPManagement.API
dotnet build
dotnet publish -c Release
```

### Frontend
```bash
cd IPManagement.Web
npm run build
```

## License

MIT License

##

Dưới đây là thông tin tài khoản để đăng nhập vào hệ thống:

Tài khoản Admin (toàn hệ thống):

Email: admin@ipmanagement.com
Mật khẩu: Admin@123
Vai trò: Admin
Tài khoản UnitAdmin (quản lý đơn vị):

IT Department:

Email: it.admin@ipmanagement.com
Mật khẩu: User@123
HR Department:

Email: hr.admin@ipmanagement.com
Mật khẩu: User@123
Tài khoản User (nhân viên):

IT Staff:

Email: it.user@ipmanagement.com
Mật khẩu: User@123
HR Staff:

Email: hr.user@ipmanagement.com
Mật khẩu: User@123
Các tài khoản này được tạo tự động khi ứng dụng chạy lần đầu (seed data).