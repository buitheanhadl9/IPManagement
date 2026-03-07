import api from './api';
import type { User, UserCreateRequest, UserUpdateRequest, UserListResponse } from '../types/user';

export const userService = {
  getAllUsers: async (pageNumber = 1, pageSize = 10, unitId?: number): Promise<UserListResponse> => {
    const params = new URLSearchParams({
      pageNumber: pageNumber.toString(),
      pageSize: pageSize.toString(),
    });
    if (unitId) {
      params.append('unitId', unitId.toString());
    }
    const response = await api.get<UserListResponse>(`/users?${params}`);
    return response.data;
  },

  getUserById: async (userId: string): Promise<User> => {
    const response = await api.get<User>(`/users/${userId}`);
    return response.data;
  },

  createUser: async (data: UserCreateRequest): Promise<User> => {
    const response = await api.post<User>('/users', data);
    return response.data;
  },

  updateUser: async (userId: string, data: UserUpdateRequest): Promise<User> => {
    const response = await api.put<User>(`/users/${userId}`, data);
    return response.data;
  },

  deleteUser: async (userId: string): Promise<void> => {
    await api.delete(`/users/${userId}`);
  },
};