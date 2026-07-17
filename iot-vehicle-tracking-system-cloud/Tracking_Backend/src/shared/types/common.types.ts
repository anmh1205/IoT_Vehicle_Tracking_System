import type { Request } from 'express';

export const USER_ROLES = ['root', 'admin', 'manager', 'operator', 'viewer'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const isUserRole = (value: string): value is UserRole =>
  (USER_ROLES as readonly string[]).includes(value);

export interface SessionUser {
  id: number;
  username: string;
  role: UserRole;
  deviceAccessMode: string;
}

export interface AuthenticatedRequest extends Request {
  user?: SessionUser;
  correlationId?: string;
}
