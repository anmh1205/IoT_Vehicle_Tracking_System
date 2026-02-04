import { api } from './http';

interface LoginRequest {
    email: string;
    password: string;
}

interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    user: {
        id: number;
        username: string;
        email: string;
        fullName: string;
        role: string;
    };
}

export const authApi = {
    login: (data: LoginRequest) => api.post<AuthResponse>('/auth/login', data),
    register: (data: any) => api.post<AuthResponse>('/auth/register', data),
    refresh: (refreshToken: string) => api.post<AuthResponse>('/auth/refresh', { refreshToken }),
    getProfile: () => api.get<any>('/auth/profile'),
    logout: () => api.post<void>('/auth/logout', {}),
};
