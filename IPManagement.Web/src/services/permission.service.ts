import api from './api';

export interface PermissionResponse {
  permissions: string[];
}

export interface RolePermissionResponse {
  roleName: string;
  permissions: string[];
}

export const permissionService = {
  // Get current user's permissions
  getMyPermissions: async (): Promise<string[]> => {
    const response = await api.get<PermissionResponse>('/permissions/me');
    return response.data.permissions;
  },

  // Get permissions for a specific role
  getRolePermissions: async (roleName: string): Promise<string[]> => {
    const response = await api.get<RolePermissionResponse>(`/permissions/role/${roleName}`);
    return response.data.permissions;
  },

  // Get all roles and their permissions
  getAllRolePermissions: async (): Promise<RolePermissionResponse[]> => {
    const response = await api.get<RolePermissionResponse[]>('/permissions/roles');
    return response.data;
  },

  // Get role permissions by role ID
  getRolePermissionsById: async (roleId: string): Promise<string[]> => {
    const response = await api.get<string[]>(`/roles/${roleId}/permissions`);
    return response.data;
  },

  // Update role permissions
  updateRolePermissions: async (roleId: string, permissions: string[]): Promise<void> => {
    await api.put(`/roles/${roleId}/permissions`, permissions);
  },

  // Get all available permissions
  getAllAvailablePermissions: async (): Promise<string[]> => {
    const response = await api.get<string[]>('/roles/permissions/all');
    return response.data;
  },
};