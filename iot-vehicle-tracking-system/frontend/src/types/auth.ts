/**
 * Auth Types - Aligned with backend User entity
 * CORRECTED based on REVIEW_CORRECTIONS.md
 */
import type { BaseEntity } from './common';

// Backend has 4 roles: admin, manager, staff, user
export type UserRole = 'admin' | 'manager' | 'staff' | 'user';

// Backend User status enum
export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface User extends BaseEntity {
  email: string;
  username: string;
  fullName?: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;     // Backend uses "status" not "isActive"
  lastLogin?: string;     // Backend uses "lastLogin" not "lastLoginAt"
}

// Backend returns session object, not tokens
export interface SessionResponse {
  token: string;          // Backend uses "token" not "accessToken"
  refreshToken: string;
  expiresAt: string;      // Backend returns ISO string, not expiresIn number
}

export interface LoginDto {
  username: string;       // Backend accepts username OR email in this field
  password: string;
}

export interface LoginResponse {
  user: User;
  session: SessionResponse;  // Backend uses "session" not "tokens"
}

export interface RegisterDto {
  email: string;
  password: string;
  username: string;
  fullName?: string;
  phone?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;      // Match backend field name
  refreshToken: string | null;
  expiresAt: string | null;  // For token expiration check
  isAuthenticated: boolean;
}

