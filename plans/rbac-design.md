# RBAC Design: Unified Roles (Gộp System Roles + Unit Roles)

## 1. Tổng quan

Hệ thống sử dụng mô hình RBAC đơn giản hóa với **Unified Roles**:
- Roles được gán cho user qua Unit Assignments
- Level cao nhất của user trong bất kỳ unit nào sẽ áp dụng cho **toàn hệ thống**

## 2. Mô hình Unified Roles

### 2.1. Level quyền (từ thấp đến cao)

| Level | Role      | Quyền                              |
|-------|-----------|------------------------------------|
| 1     | User      | Chỉ xem (Read-only)               |
| 2     | UnitAdmin | Quản lý IP (CRUD IP)              |
| 3     | Admin     | Toàn quyền (Full access)          |

### 2.2. Logic gộp quyền

```
Quyền của user = Max(All unit roles)

Ví dụ:
- User có: [Unit A: User, Unit B: UnitAdmin, Unit C: User]
- Quyền áp dụng: UnitAdmin (level cao nhất)
- Kết quả: User CRUD IP được ở TẤT CẢ units
```

## 3. Quy tắc ưu tiên

1. **User có Admin ở bất kỳ unit nào** → Toàn quyền hệ thống
2. **User có UnitAdmin ở bất kỳ unit nào (không có Admin)** → CRUD IP toàn hệ thống
3. **User chỉ có User ở tất cả units** → Chỉ xem toàn hệ thống

## 4. Ví dụ

### Ví dụ 1: Chỉ xem
```
Unit Assignments:
- Unit A: User
- Unit B: User
- Unit C: User

Quyền áp dụng: User (Chỉ xem toàn hệ thống)
```

### Ví dụ 2: UnitAdmin (CRUD IP)
```
Unit Assignments:
- Unit A: User
- Unit B: UnitAdmin
- Unit C: User

Quyền áp dụng: UnitAdmin (CRUD IP toàn hệ thống)
```

### Ví dụ 3: Admin (Toàn quyền)
```
Unit Assignments:
- Unit A: User
- Unit B: UnitAdmin
- Unit C: Admin

Quyền áp dụng: Admin (Toàn quyền hệ thống)
```

## 5. Implementation

### 5.1. Permission mapping

```typescript
// Level quyền
const ROLE_LEVELS: Record<string, number> = {
  User: 1,
  UnitAdmin: 2,
  Admin: 3,
};

// Permissions theo level
const LEVEL_PERMISSIONS: Record<number, Permission[]> = {
  1: [IP_READ, UNIT_READ],                           // User
  2: [IP_READ, IP_CREATE, IP_UPDATE, IP_DELETE, UNIT_READ],  // UnitAdmin
  3: [IP_READ, IP_CREATE, IP_UPDATE, IP_DELETE, UNIT_READ, UNIT_CREATE, UNIT_UPDATE, UNIT_DELETE, USER_READ, USER_CREATE, USER_UPDATE, USER_DELETE],  // Admin
};
```

### 5.2. Hàm tính quyền user

```typescript
function getUserPermissionLevel(user: User): number {
  if (!user.units || user.units.length === 0) {
    return 1; // Mặc định là User nếu không có unit
  }
  
  // Tìm level cao nhất trong tất cả unit assignments
  const maxLevel = Math.max(
    ...user.units.map(u => ROLE_LEVELS[u.role] || 1)
  );
  
  return maxLevel;
}

function hasPermission(user: User, permission: Permission): boolean {
  const userLevel = getUserPermissionLevel(user);
  const allowedPermissions = LEVEL_PERMISSIONS[userLevel] || [];
  return allowedPermissions.includes(permission);
}
```

## 6. Cập nhật permissions.ts

```typescript
// Permission constants
export const Permissions = {
  // IP Address permissions
  IP_CREATE: 'ip:create',
  IP_READ: 'ip:read',
  IP_UPDATE: 'ip:update',
  IP_DELETE: 'ip:delete',
  
  // Unit permissions
  UNIT_CREATE: 'unit:create',
  UNIT_READ: 'unit:read',
  UNIT_UPDATE: 'unit:update',
  UNIT_DELETE: 'unit:delete',
  
  // User permissions
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
};

// Role constants
export const Roles = {
  ADMIN: 'Admin',
  UNIT_ADMIN: 'UnitAdmin',
  USER: 'User',
};

// Level mapping
const ROLE_LEVELS: Record<string, number> = {
  [Roles.USER]: 1,
  [Roles.UNIT_ADMIN]: 2,
  [Roles.ADMIN]: 3,
};

// Permissions theo level
const LEVEL_PERMISSIONS: Record<number, string[]> = {
  1: [
    Permissions.IP_READ,
    Permissions.UNIT_READ,
    Permissions.USER_READ,
  ],
  2: [
    Permissions.IP_READ,
    Permissions.IP_CREATE,
    Permissions.IP_UPDATE,
    Permissions.IP_DELETE,
    Permissions.UNIT_READ,
    Permissions.USER_READ,
  ],
  3: [
    Permissions.IP_READ,
    Permissions.IP_CREATE,
    Permissions.IP_UPDATE,
    Permissions.IP_DELETE,
    Permissions.UNIT_READ,
    Permissions.UNIT_CREATE,
    Permissions.UNIT_UPDATE,
    Permissions.UNIT_DELETE,
    Permissions.USER_READ,
    Permissions.USER_CREATE,
    Permissions.USER_UPDATE,
    Permissions.USER_DELETE,
  ],
};

// Helper: Tính level quyền cao nhất của user
export const getUserPermissionLevel = (user: User): number => {
  if (!user.units || user.units.length === 0) {
    return 1; // Mặc định là User
  }
  
  const maxLevel = Math.max(
    ...user.units.map(u => ROLE_LEVELS[u.role] || 1)
  );
  
  return maxLevel;
};

// Helper: Kiểm tra quyền
export const hasPermission = (user: User | undefined, permission: string): boolean => {
  if (!user) return false;
  
  const userLevel = getUserPermissionLevel(user);
  const allowedPermissions = LEVEL_PERMISSIONS[userLevel] || [];
  return allowedPermissions.includes(permission);
};

// Helper: Kiểm tra nếu user là Admin
export const isAdmin = (user: User | undefined): boolean => {
  if (!user || !user.units) return false;
  return getUserPermissionLevel(user) >= 3;
};
```

## 7. Benefits

1. **Đơn giản**: Chỉ cần gán role trong Unit Assignments
2. **Nhất quán**: Level cao nhất áp dụng cho toàn hệ thống
3. **Dễ hiểu**: User thấy quyền của mình rõ ràng
4. **Linh hoạt**: Có thể gán nhiều unit với role khác nhau