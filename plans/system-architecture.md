# Kiến trúc hệ thống Quản lý IP

## 1. Tổng quan hệ thống

```mermaid
graph TB
    subgraph "Frontend - React/TypeScript"
        A[Web Browser]
        B[React App]
        C[Components]
        D[Pages]
        E[Services]
    end
    
    subgraph "Backend - .NET 9"
        F[ASP.NET Core API]
        G[Controllers]
        H[Services]
        I[DTOs]
        J[Identity]
    end
    
    subgraph "Database - PostgreSQL"
        K[(PostgreSQL DB)]
    end
    
    A --> B
    B --> C
    B --> D
    B --> E
    E --> F
    F --> G
    F --> H
    F --> I
    G --> H
    H --> J
    H --> K
    J --> K
```

---

## 2. Mô hình dữ liệu chính

```mermaid
erDiagram
    ApplicationUser {
        Guid Id PK
        string Username
        string Email
        string FullName
        string Phone
        long? UnitId FK
        bool IsActive
        DateTime CreatedAt
        DateTime? LastLogin
    }
    
    Unit {
        long Id PK
        Guid ExternalId
        string Name
        string? Code
        long? ParentUnitId FK
        string? Description
        string? Note
        bool IsActive
        DateTime CreatedAt
    }
    
    IPAddressRecord {
        long Id PK
        Guid ExternalId
        long UnitId FK
        string IPAddress
        string? MACAddress
        string? DeviceName
        string? DeviceType
        string? Port
        string Status
        string? Description
        DateTime CreatedAt
    }
    
    AuditLog {
        long Id PK
        Guid UserId FK
        long? IPAddressId FK
        string Action
        string? OldValue
        string? NewValue
        DateTime CreatedAt
    }
    
    ApplicationUser }|--|| Unit : "belongs to"
    Unit ||--o{ ApplicationUser : "has users"
    Unit ||--o{ Unit : "parent-child"
    Unit ||--o{ IPAddressRecord : "has IPs"
    Unit ||--o{ AuditLog : "logs"
    ApplicationUser ||--o{ AuditLog : "creates"
    ApplicationUser ||--o{ IPAddressRecord : "creates/updates"
```

---

## 3. Phân quyền và Role

```mermaid
graph LR
    subgraph "Phân quyền hệ thống"
        A[Admin]
        B[UnitAdmin]
        C[User]
    end
    
    subgraph "Phạm vi truy cập"
        D[Tất cả đơn vị]
        E[Đơn vị + Đơn vị con]
        F[Đơn vị của mình]
    end
    
    A --> D
    B --> E
    C --> F
```

### Chi tiết phân quyền:

| Role | Quản lý Users | Quản lý Đơn vị | Quản lý IP | Xem báo cáo |
|------|--------------|----------------|------------|-------------|
| **Admin** | ✅ Toàn hệ thống | ✅ Toàn hệ thống | ✅ Toàn hệ thống | ✅ Tất cả |
| **UnitAdmin** | ❌ | ✅ Đơn vị + con | ✅ Đơn vị + con | ✅ Đơn vị + con |
| **User** | ❌ | ❌ | ✅ Đơn vị của mình | ✅ Đơn vị của mình |

---

## 4. Cây đơn vị (Unit Hierarchy)

```mermaid
graph TD
    A[Đơn vị cấp 1<br/>e.g., Công ty]
    B[Đơn vị cấp 2<br/>e.g., Phòng IT]
    C[Đơn vị cấp 2<br/>e.g., Phòng HR]
    D[Đơn vị cấp 3<br/>e.g., Team Dev]
    E[Đơn vị cấp 3<br/>e.g., Team QA]
    
    A --> B
    A --> C
    B --> D
    B --> E
```

### Đặc điểm:
- **Không giới hạn số cấp** (có thể có cấp 1, 2, 3, ...)
- **Mỗi đơn vị chỉ có 1 đơn vị cha** (ParentUnitId)
- **UnitAdmin** của đơn vị cấp trên có quyền quản lý tất cả đơn vị con

---

## 5. Luồng đăng nhập và phân quyền

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend API
    participant DB as Database
    
    U->>F: Nhập credentials
    F->>B: POST /api/auth/login
    B->>DB: Validate user
    DB-->>B: User data + Roles
    B->>B: Generate JWT token
    B-->>F: Token + User info
    F->>F: Store token in localStorage
    F->>F: Redirect to Dashboard
    
    Note over U,DB: Mỗi request sau
    U->>F: Click menu item
    F->>B: GET /api/xxx (with token)
    B->>B: Validate JWT + Check permissions
    B->>DB: Fetch data based on UnitId + Roles
    DB-->>B: Filtered data
    B-->>F: Data
    F->>U: Display data
```

---

## 6. Luồng quản lý IP theo đơn vị

```mermaid
graph TD
    A[User đăng nhập] --> B{Phân loại}
    B -->|Admin| C[Xem tất cả IPs]
    B -->|UnitAdmin| D[Xem IPs của đơn vị + đơn vị con]
    B -->|User| E[Xem IPs của đơn vị mình]
    
    C --> F[Thêm/Sửa/Xóa IP]
    D --> F
    E --> G[Chỉ xem hoặc thêm IP<br/>tùy permission]
    
    F --> H[Lưu vào DB<br/>với UnitId]
    G --> H
```

---

## 7. Các API chính

```mermaid
graph TB
    subgraph "Authentication"
        A1[POST /api/auth/login]
        A2[POST /api/auth/register]
        A3[POST /api/auth/refresh]
    end
    
    subgraph "Users"
        U1[GET /api/users]
        U2[POST /api/users]
        U3[PUT /api/users/{id}]
        U4[DELETE /api/users/{id}]
    end
    
    subgraph "Units"
        UN1[GET /api/units]
        UN2[GET /api/units/tree]
        UN3[POST /api/units]
        UN4[PUT /api/units/{id}]
        UN5[DELETE /api/units/{id}]
    end
    
    subgraph "IP Addresses"
        I1[GET /api/ip-addresses]
        I2[POST /api/ip-addresses]
        I3[PUT /api/ip-addresses/{id}]
        I4[DELETE /api/ip-addresses/{id}]
        I5[GET /api/ip-addresses/check-status]
    end
    
    subgraph "Audit Logs"
        L1[GET /api/audit-logs]
    end
```

---

## 8. Frontend Pages

```mermaid
graph TD
    A[Login Page] --> B{Auth success}
    B -->|Yes| C[Main Layout]
    B -->|No| A
    
    subgraph "Main Layout"
        C --> D[Dashboard]
        C --> E[IP Management]
        C --> F[Units Management]
        C --> G[Users Management<br/>Admin only]
    end
    
    F --> H[Unit Detail<br/>Xem IPs theo đơn vị]
```

---

## 9. Tóm tắt kiến trúc

| Thành phần | Công nghệ | Mô tả |
|-----------|----------|-------|
| **Frontend** | React 19, TypeScript, Ant Design | SPA với routing, Redux store |
| **Backend** | .NET 9, ASP.NET Core | REST API, JWT authentication |
| **Database** | PostgreSQL | Entity Framework Core |
| **Authentication** | ASP.NET Core Identity | JWT tokens, Roles |
| **Authorization** | Custom policy + UnitId | Phân quyền theo role và đơn vị |

---

## 10. Điểm mạnh của kiến trúc hiện tại

1. **Đơn giản**: Mỗi user thuộc 1 đơn vị, dễ quản lý
2. **Linh hoạt**: Role bổ sung phân quyền chi tiết
3. **Mở rộng**: Cây đơn vị không giới hạn số cấp
4. **Bảo mật**: JWT + phân quyền ở cả frontend và backend
5. **Audit**: Ghi log mọi thay đổi quan trọng