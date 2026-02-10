import { apiClient } from './client';
import type { User } from './auth';
import type { ApiResponse } from '@/types';

export const usersApi = {
  list: () =>
    apiClient.get<ApiResponse<User[]>>('/auth/users'),
  getById: (id: number) =>
    apiClient.get<ApiResponse<User>>(`/auth/users/${id}`),
  create: (data: { username: string; password: string; fullName?: string; role?: string; email?: string }) =>
    apiClient.post<ApiResponse<User>>('/auth/users', data),
  update: (id: number, data: { fullName?: string; role?: string; email?: string; status?: string }) =>
    apiClient.patch<ApiResponse<User>>(`/auth/users/${id}`, data),
  delete: (id: number) =>
    apiClient.delete(`/auth/users/${id}`),
};
