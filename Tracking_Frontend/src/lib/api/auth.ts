import { apiClient } from './client';

export interface User {
  id: number;
  username: string;
  fullName: string;
  role: string;
  deviceAccessMode: string;
  status: string;
  email: string | null;
  avatarUrl: string | null;
}

export interface LoginResponse {
  success: boolean;
  data: { user: User; token: string; expiresAt: string };
}

export const authApi = {
  login: (username: string, password: string) =>
    apiClient.post<LoginResponse>('/auth/login', { username, password }),
  logout: () => apiClient.post('/auth/logout'),
  getMe: () =>
    apiClient.get<{ success: boolean; data: { user: User } }>('/auth/me'),
};
