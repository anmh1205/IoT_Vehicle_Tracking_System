export interface User {
  id: number;
  username: string;
  password_hash: string;
  full_name: string;
  role: string;
  device_access_mode: string;
  status: string;
  email: string | null;
  avatar_url: string | null;
  preferences: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface UserSession {
  id: number;
  user_id: number;
  session_token: string;
  login_at: Date;
  expires_at: Date;
  is_active: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: UserPublic;
  token: string;
  expiresAt: Date;
}

export interface UserPublic {
  id: number;
  username: string;
  fullName: string;
  role: string;
  deviceAccessMode: string;
  status: string;
  email: string | null;
  avatarUrl: string | null;
}

export interface CreateUserInput {
  username: string;
  password: string;
  fullName: string;
  role?: string;
  deviceAccessMode?: string;
  email?: string;
}

export interface UpdateUserInput {
  fullName?: string;
  role?: string;
  deviceAccessMode?: string;
  status?: string;
  email?: string | null;
  avatarUrl?: string | null;
}

export interface UserListQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}
