import api from './api';
import type { Role, CreateRoleRequest, AssignRoleToUserRequest, RemoveRoleFromUserRequest } from '../types/role';

export const roleService = {
  getAllRoles: async (): Promise<Role[]> => {
    const response = await api.get<Role[]>('/roles');
    return response.data;
  },

  getRoleById: async (roleId: string): Promise<Role> => {
    const response = await api.get<Role>(`/roles/${roleId}`);
    return response.data;
  },

  createRole: async (data: CreateRoleRequest): Promise<Role> => {
    const response = await api.post<Role>('/roles', data);
    return response.data;
  },

  updateRole: async (roleId: string, data: { name: string; description?: string }): Promise<void> => {
    await api.put(`/roles/${roleId}`, data);
  },

  deleteRole: async (roleId: string): Promise<void> => {
    await api.delete(`/roles/${roleId}`);
  },

  getUserRoles: async (userId: string): Promise<Role[]> => {
    const response = await api.get<Role[]>(`/roles/user/${userId}`);
    return response.data;
  },

  assignRoleToUser: async (userId: string, roleName: string): Promise<void> => {
    await api.post(`/roles/user/${userId}/assign`, { roleName });
  },

  removeRoleFromUser: async (userId: string, roleName: string): Promise<void> => {
    await api.post(`/roles/user/${userId}/remove`, { roleName });
  },
};