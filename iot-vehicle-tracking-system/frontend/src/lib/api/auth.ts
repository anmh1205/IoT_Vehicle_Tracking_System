/**
 * Auth API Service - Aligned with backend routes
 */
import { http } from './http';
import { API } from './endpoints';
import type { LoginDto, LoginResponse, RegisterDto, User, ApiResponse } from '@/types';

export const authServices = {
  login: async (data: LoginDto): Promise<LoginResponse> => {
    return http.post<LoginResponse>(API.AUTH.LOGIN, data);
  },

  logout: async (): Promise<void> => {
    await http.post(API.AUTH.LOGOUT);
  },

  register: async (data: RegisterDto): Promise<ApiResponse<User>> => {
    return http.post<ApiResponse<User>>(API.AUTH.REGISTER, data);
  },

  // Backend uses /auth/profile not /auth/me
  getProfile: async (): Promise<User> => {
    return http.get<User>(API.AUTH.PROFILE);
  },

  refreshToken: async (refreshToken: string): Promise<{ token: string }> => {
    return http.post<{ token: string }>(API.AUTH.REFRESH, { refreshToken });
  },
};
