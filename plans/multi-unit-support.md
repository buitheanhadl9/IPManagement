# Kế hoạch hỗ trợ nhiều đơn vị cho một User

## 1. Vấn đề hiện tại

Hiện tại hệ thống sử dụng mô hình Many-to-One:
- `ApplicationUser.UnitId` (long?) - mỗi user chỉ thuộc về **một đơn vị**
- Khi user thuộc nhiều đơn vị, cần thay đổi sang Many-to-Many

## 2. Giải pháp

Tạo bảng join `UserUnitAssignment` để liên kết User và UnitMany-to-Many:

### Schema mới

```sql
CREATE TABLE UserUnitAssignments (
    Id BIGSERIAL PRIMARY KEY,
    UserId UUID NOT NULL REFERENCES AspNetUsers(Id),
    UnitId BIGINT NOT NULL REFERENCES Units(Id),
    Role VARCHAR(50) NOT NULL DEFAULT 'User',  -- Admin, UnitAdmin, User
    IsPrimary BOOLEAN NOT NULL DEFAULT FALSE,  -- Đơn vị chính
    CreatedAt TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(UserId, UnitId)
);
```

### Entity Model

```csharp
public class UserUnitAssignment
{
    public long Id { get; set; }
    
    public string UserId { get; set; }
    public ApplicationUser User { get; set; }
    
    public long UnitId { get; set; }
    public Unit Unit { get; set; }
    
    public string Role { get; set; } = "User";  // Admin, UnitAdmin, User
    public bool IsPrimary { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
```

## 3. Thay đổi cần thực hiện

### 3.1 Backend - Database & Models

**Bước 1:** Tạo model mới `UserUnitAssignment.cs`

```csharp
namespace IPManagement.API.Models
{
    public class UserUnitAssignment
    {
        public long Id { get; set; }
        public string UserId { get; set; }
        public ApplicationUser User { get; set; }
        public long UnitId { get; set; }
        public Unit Unit { get; set; }
        public string Role { get; set; } = "User";
        public bool IsPrimary { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
```

**Bước 2:** Cập nhật `ApplicationDbContext.cs`

```csharp
public DbSet<UserUnitAssignment> UserUnitAssignments { get; set; }

protected override void OnModelCreating(ModelBuilder builder)
{
    // ... existing code ...
    
    builder.Entity<UserUnitAssignment>(entity =>
    {
        entity.HasKey(e => e.Id);
        entity.HasIndex(e => new { e.UserId, e.UnitId }).IsUnique();
        entity.HasOne(e => e.User).WithMany(u => e.UserUnitAssignments).HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
        entity.HasOne(e => e.Unit).WithMany(u => u.UserUnitAssignments).HasForeignKey(e => e.UnitId).OnDelete(DeleteBehavior.Cascade);
    });
}
```

**Bước 3:** Cập nhật `ApplicationUser.cs`

```csharp
public class ApplicationUser : IdentityUser
{
    // Giữ lại UnitId cho backward compatibility (đơn vị chính)
    public long? UnitId { get; set; }
    public Unit? Unit { get; set; }
    
    public string? FullName { get; set; }
    public string? Phone { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public DateTime? LastLogin { get; set; }
    
    public ICollection<IPAddressRecord> CreatedIPAddresses { get; set; } = new List<IPAddressRecord>();
    public ICollection<IPAddressRecord> UpdatedIPAddresses { get; set; } = new List<IPAddressRecord>();
    public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
    
    // NEW: Many-to-Many với Unit
    public ICollection<UserUnitAssignment> UserUnitAssignments { get; set; } = new List<UserUnitAssignment>();
}
```

**Bước 4:** Cập nhật `Unit.cs`

```csharp
public class Unit
{
    // ... existing properties ...
    
    // NEW: Many-to-Many với User
    public virtual ICollection<ApplicationUser> Users { get; set; } = new List<ApplicationUser>();
    public ICollection<UserUnitAssignment> UserUnitAssignments { get; set; } = new List<UserUnitAssignment>();
}
```

**Bước 5:** Tạo migration

```bash
cd IPManagement.API
dotnet ef migrations add AddUserUnitAssignment
dotnet ef database update
```

### 3.2 Backend - DTOs

**Cập nhật `UserDTOs.cs`:**

```csharp
public class UserDetailDto
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? FullName { get; set; }
    public string? Phone { get; set; }
    
    // OLD: Single unit
    // public long? UnitId { get; set; }
    // public string? UnitName { get; set; }
    
    // NEW: Multiple units
    public UserUnitDto[] Units { get; set; } = Array.Empty<UserUnitDto>();
    public string[] Roles { get; set; } = Array.Empty<string>();
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime? LastLogin { get; set; }
}

public class UserUnitDto
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = "User";
    public bool IsPrimary { get; set; }
}

public class UserCreateRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string? FullName { get; set; }
    public string? Phone { get; set; }
    
    // NEW: Assign multiple units
    public UserUnitAssignmentRequest[]? UnitAssignments { get; set; }
    public string[]? Roles { get; set; }
}

public class UserUnitAssignmentRequest
{
    public long UnitId { get; set; }
    public string Role { get; set; } = "User";
    public bool IsPrimary { get; set; }
}

public class UserUpdateRequest
{
    public string Email { get; set; } = string.Empty;
    public string? FullName { get; set; }
    public string? Phone { get; set; }
    public bool IsActive { get; set; }
    
    // NEW: Update unit assignments
    public UserUnitAssignmentRequest[]? UnitAssignments { get; set; }
    public string[]? Roles { get; set; }
}
```

### 3.3 Backend - Service Logic

**Cập nhật `UserService.cs`:**

```csharp
public class UserService : IUserService
{
    // ... existing code ...
    
    public async Task<UserDetailDto> CreateUserAsync(Guid userId, UserCreateRequest request)
    {
        // ... existing user creation code ...
        
        // Assign units
        if (request.UnitAssignments != null && request.UnitAssignments.Length > 0)
        {
            foreach (var unitAssignment in request.UnitAssignments)
            {
                var assignment = new UserUnitAssignment
                {
                    UserId = user.Id.ToString(),
                    UnitId = unitAssignment.UnitId,
                    Role = unitAssignment.Role,
                    IsPrimary = unitAssignment.IsPrimary
                };
                _context.UserUnitAssignments.Add(assignment);
                
                // Set UnitId to primary unit for backward compatibility
                if (unitAssignment.IsPrimary)
                {
                    user.UnitId = unitAssignment.UnitId;
                }
            }
        }
        
        await _context.SaveChangesAsync();
        return await GetUserByIdAsync(userId, newUser.Id);
    }
    
    public async Task<UserDetailDto> UpdateUserAsync(Guid currentUserId, Guid userId, UserUpdateRequest request)
    {
        // ... existing user update code ...
        
        // Update unit assignments
        if (request.UnitAssignments != null)
        {
            // Remove existing assignments
            var existingAssignments = _context.UserUnitAssignments.Where(u => u.UserId == userId.ToString());
            _context.UserUnitAssignments.RemoveRange(existingAssignments);
            
            // Add new assignments
            bool hasPrimary = false;
            foreach (var unitAssignment in request.UnitAssignments)
            {
                var assignment = new UserUnitAssignment
                {
                    UserId = userId.ToString(),
                    UnitId = unitAssignment.UnitId,
                    Role = unitAssignment.Role,
                    IsPrimary = unitAssignment.IsPrimary
                };
                _context.UserUnitAssignments.Add(assignment);
                
                if (unitAssignment.IsPrimary)
                {
                    user.UnitId = unitAssignment.UnitId;
                    hasPrimary = true;
                }
            }
            
            // If no primary selected, set first unit as primary
            if (!hasPrimary && request.UnitAssignments.Length > 0)
            {
                user.UnitId = request.UnitAssignments[0].UnitId;
            }
        }
        
        await _context.SaveChangesAsync();
        return await GetUserByIdAsync(currentUserId, userId);
    }
    
    public async Task<UserListDto[]> GetUsersAsync(Guid currentUserId, int pageNumber, int pageSize, long? unitId)
    {
        // Filter users by unit if specified
        var query = _context.Users
            .Include(u => u.UserUnitAssignments)
            .ThenInclude(ua => ua.Unit)
            .AsQueryable();
        
        if (unitId.HasValue)
        {
            query = query.Where(u => u.UserUnitAssignments.Any(u => u.UnitId == unitId.Value));
        }
        
        // ... pagination and mapping ...
    }
}
```

**Cập nhật authorization logic:**

```csharp
private async Task<bool> CanAccessUnitAsync(Guid userId, long unitId)
{
    var user = await _context.Users.FindAsync(userId.ToString());
    if (user == null)
        return false;

    if (await IsAdminAsync(user))
        return true;

    // Check if user has access to this unit via UserUnitAssignments
    var hasAccess = await _context.UserUnitAssignments
        .AnyAsync(u => u.UserId == userId.ToString() && u.UnitId == unitId);
    
    if (hasAccess)
        return true;

    // Fallback to old UnitId for backward compatibility
    return user.UnitId == unitId;
}
```

### 3.4 Frontend - Types

**Cập nhật `IPManagement.Web/src/types/user.ts`:**

```typescript
export interface User {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  phone?: string;
  units: UserUnit[];  // NEW: Multiple units
  roles: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  lastLogin?: string;
}

export interface UserUnit {
  id: number;
  name: string;
  role: string;  // Admin, UnitAdmin, User
  isPrimary: boolean;
}

export interface UserCreateRequest {
  email: string;
  password: string;
  username: string;
  fullName?: string;
  phone?: string;
  unitAssignments?: UserUnitAssignmentRequest[];  // NEW
  roles?: string[];
}

export interface UserUnitAssignmentRequest {
  unitId: number;
  role: string;
  isPrimary: boolean;
}

export interface UserUpdateRequest {
  email: string;
  fullName?: string;
  phone?: string;
  isActive: boolean;
  unitAssignments?: UserUnitAssignmentRequest[];  // NEW
  roles?: string[];
}
```

### 3.5 Frontend - UsersPage Component

**Cập nhật form để chọn nhiều đơn vị:**

```tsx
const UsersPage = () => {
  // ... existing code ...
  
  return (
    // ...
    <Modal title={editingId ? 'Edit User' : 'Add User'} open={modalVisible} ...>
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        {/* ... existing fields ... */}
        
        <Form.Item name="unitAssignments" label="Unit Assignments">
          <Select
            mode="tags"
            placeholder="Select units and assign roles"
            style={{ width: '100%' }}
            options={unitOptions}
          />
        </Form.Item>
        
        {/* Or use a custom table for better UX */}
      </Form>
    </Modal>
  );
};
```

## 4. Migration Plan

### Phase 1: Database Migration
1. Tạo bảng `UserUnitAssignments`
2. Tạo migration và update database
3. Copy dữ liệu từ `User.UnitId` sang `UserUnitAssignments` (set IsPrimary = true)

### Phase 2: Backend Update
1. Update models và DbContext
2. Update DTOs
3. Update service logic
4. Update authorization logic
5. Test API endpoints

### Phase 3: Frontend Update
1. Update types
2. Update UsersPage component
3. Test UI

### Phase 4: Data Migration
```sql
-- Copy existing UnitId assignments to UserUnitAssignments
INSERT INTO "UserUnitAssignments" ("UserId", "UnitId", "Role", "IsPrimary", "CreatedAt")
SELECT "Id", "UnitId", 'User', TRUE, NOW()
FROM "AspNetUsers"
WHERE "UnitId" IS NOT NULL;
```

## 5. Benefits

1. **Flexibility**: Một user có thể quản lý nhiều đơn vị
2. **Granular permissions**: Role khác nhau cho từng đơn vị
3. **Backward compatible**: Giữ lại `UnitId` cho các query cũ
4. **Audit trail**: Lịch sử gán đơn vị cho user

## 6. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking changes | Giữ lại UnitId, update authorization logic để check cả 2 |
| Performance | Thêm index trên UserId, UnitId |
| Data inconsistency | Transaction khi update unit assignments |