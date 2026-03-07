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

// Permission mapping by role
export const RolePermissions: Record<string, string[]> = {
  [Roles.ADMIN]: [
    // IP permissions
    Permissions.IP_CREATE,
    Permissions.IP_READ,
    Permissions.IP_UPDATE,
    Permissions.IP_DELETE,
    // Unit permissions
    Permissions.UNIT_CREATE,
    Permissions.UNIT_READ,
    Permissions.UNIT_UPDATE,
    Permissions.UNIT_DELETE,
    // User permissions
    Permissions.USER_CREATE,
    Permissions.USER_READ,
    Permissions.USER_UPDATE,
    Permissions.USER_DELETE,
  ],
  [Roles.UNIT_ADMIN]: [
    // IP permissions
    Permissions.IP_CREATE,
    Permissions.IP_READ,
    Permissions.IP_UPDATE,
    Permissions.IP_DELETE,
    // Unit permissions (read only)
    Permissions.UNIT_READ,
    // User permissions (read only)
    Permissions.USER_READ,
  ],
  [Roles.USER]: [
    // IP permissions (read only)
    Permissions.IP_READ,
    // Unit permissions (read only)
    Permissions.UNIT_READ,
    // User permissions (read only)
    Permissions.USER_READ,
  ],
};

// Helper function to check if a user has a specific permission
export const hasPermission = (userRoles: string[] | undefined, permission: string): boolean => {
  if (!userRoles || userRoles.length === 0) {
    return false;
  }
  
  // Nếu user chỉ có role "User" thì không có quyền create/update/delete
  const hasOnlyUserRole = userRoles.length === 1 && userRoles[0] === Roles.USER;
  if (hasOnlyUserRole) {
    // User chỉ có quyền read
    return permission === Permissions.IP_READ || permission === Permissions.UNIT_READ || permission === Permissions.USER_READ;
  }
  
  for (const role of userRoles) {
    const rolePerms = RolePermissions[role];
    if (rolePerms && rolePerms.includes(permission)) {
      return true;
    }
  }
  
  return false;
};

// Helper function to check if a user has any of the specified roles
export const hasRole = (userRoles: string[] | undefined, roles: string[]): boolean => {
  if (!userRoles || userRoles.length === 0) {
    return false;
  }
  
  return userRoles.some(role => roles.includes(role));
};

// Helper function to check if a user is Admin
export const isAdmin = (userRoles: string[] | undefined): boolean => {
  return hasRole(userRoles, [Roles.ADMIN]);
};

// Helper function to check if a user is UnitAdmin
export const isUnitAdmin = (userRoles: string[] | undefined): boolean => {
  return hasRole(userRoles, [Roles.UNIT_ADMIN]);
};

// Helper function to check if a user is regular User
export const isRegularUser = (userRoles: string[] | undefined): boolean => {
  return hasRole(userRoles, [Roles.USER]);
};