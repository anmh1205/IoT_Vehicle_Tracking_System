import { apiClient, unwrap } from './client';
import type { User } from '@/lib/stores/auth-store';

export interface CreateUserInput {
  username: string;
  password: string;
  fullName: string;
  role: User['role'];
  email?: string;
}

export interface UpdateUserInput {
  fullName?: string;
  role?: User['role'];
  status?: 'active' | 'inactive' | 'suspended';
  email?: string | null;
}

export interface ResetPasswordResult {
  temporaryPassword: string;
}

export const userServices = {
  getList: (params?: Record<string, unknown>) =>
    apiClient.get('/users', { params }).then((r) => unwrap<User[]>(r.data)),
  getById: (id: number) => apiClient.get(`/users/${id}`).then((r) => unwrap<User>(r.data)),
  create: (data: CreateUserInput) => apiClient.post('/users', data).then((r) => unwrap<User>(r.data)),
  update: (id: number, data: UpdateUserInput) =>
    apiClient.patch(`/users/${id}`, data).then((r) => unwrap<User>(r.data)),
  delete: (id: number) =>
    apiClient.delete(`/users/${id}`).then((r) => unwrap<{ message: string }>(r.data)),
  resetPassword: (id: number) =>
    apiClient.post(`/users/${id}/reset-password`).then((r) => unwrap<ResetPasswordResult>(r.data)),
};
