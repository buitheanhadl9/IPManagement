import type { User } from '../types/auth';

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
  
  // Role permissions
  ROLE_CREATE: 'role:create',
  ROLE_READ: 'role:read',
  ROLE_UPDATE: 'role:update',
  ROLE_DELETE: 'role:delete',
  
  // Audit log permissions
  AUDIT_READ: 'audit:read',
};

// Role constants
export const Roles = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  USER: 'User',
};

// Level mapping (từ thấp đến cao)
export const ROLE_LEVELS: Record<string, number> = {
  [Roles.USER]: 1,
  [Roles.MANAGER]: 2,
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

/**
 * Tính level quyền của user dựa trên System Roles (user.roles)
 * Unit Assignments chỉ dùng để xác định user được làm việc với unit nào
 * Quyền sẽ dựa hoàn toàn vào System Roles
 */
export const getUserPermissionLevel = (user: User | undefined | null): number => {
  if (!user || !user.roles || user.roles.length === 0) {
    return 1; // Mặc định là User nếu không có role
  }
  
  // Kiểm tra theo thứ tự ưu tiên (Admin > UnitAdmin > User)
  if (user.roles.includes(Roles.ADMIN)) {
    return 3;
  }
  if (user.roles.includes(Roles.MANAGER)) {
    return 2;
  }
  
  return 1; // Mặc định là User
};

/**
 * Kiểm tra quyền của user
 * Level cao nhất trong bất kỳ unit nào sẽ áp dụng cho toàn hệ thống
 */
export const hasPermission = (user: User | undefined | null, permission: string): boolean => {
  if (!user) return false;
  
  // Ưu tiên sử dụng permissions từ backend (nếu có)
  if (user.permissions && user.permissions.length > 0) {
    return user.permissions.includes(permission);
  }
  
  // Fallback: sử dụng logic level cũ (cho trường hợp chưa có permissions từ backend)
  const userLevel = getUserPermissionLevel(user);
  const allowedPermissions = LEVEL_PERMISSIONS[userLevel] || [];
  return allowedPermissions.includes(permission);
};

/**
 * Kiểm tra nếu user có quyền Admin (level >= 3)
 */
export const isAdmin = (user: User | undefined | null): boolean => {
  return getUserPermissionLevel(user) >= 3;
};

/**
 * Kiểm tra nếu user có quyền UnitAdmin hoặc cao hơn (level >= 2)
 */
export const isUnitAdmin = (user: User | undefined): boolean => {
  return getUserPermissionLevel(user) >= 2;
};

/**
 * Kiểm tra nếu user chỉ có quyền User (level === 1)
 */
export const isRegularUser = (user: User | undefined): boolean => {
  return getUserPermissionLevel(user) === 1;
};

/**
 * Lấy danh sách permissions của user
 */
export const getUserPermissions = (user: User | undefined): string[] => {
  // Ưu tiên sử dụng permissions từ backend (nếu có)
  if (user?.permissions && user.permissions.length > 0) {
    return user.permissions;
  }
  
  // Fallback: sử dụng logic level cũ
  const userLevel = getUserPermissionLevel(user);
  return LEVEL_PERMISSIONS[userLevel] || [];
};

/**
 * Kiểm tra nếu user được gán cho unit cụ thể
 */
export const isAssignedToUnit = (user: User | undefined | null, unitId: number): boolean => {
  if (!user || !user.units || user.units.length === 0) return false;
  return user.units.some(u => u.id === unitId);
};