import api from './api';
import type { LoginRequest, LoginResponse } from '../types/auth';

export const authService = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  getProfile: async (): Promise<any> => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await api.post('/auth/change-password', { currentPassword, newPassword });
  },

  adminResetPassword: async (userId: string, newPassword: string): Promise<void> => {
    await api.post(`/auth/admin/users/${userId}/reset-password`, { newPassword });
  },
};