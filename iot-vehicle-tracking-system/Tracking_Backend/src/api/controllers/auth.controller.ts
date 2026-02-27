import type { Response } from 'express';
import type { AuthenticatedRequest } from '@/shared/types/common.types';
import { asyncHandler } from '@/shared/utils/async-handler.util';
import { sendOk, sendCreated } from '@/shared/utils/response.util';
import { createValidationError, createUnauthorizedError } from '@/shared/utils/errors.util';
import {
  loginSchema,
  changePasswordSchema,
  createUserSchema,
  updateUserSchema,
  updateProfileSchema,
  updateNotificationSchema,
} from '@/api/validators/auth.validator';
import * as authSessionService from '@/domain/auth/services/auth-session.service';
import * as authPasswordService from '@/domain/auth/services/auth-password.service';
import * as userManagementService from '@/domain/auth/services/user-management.service';
import * as userRepo from '@/domain/auth/repositories/user.repository';
import * as userSessionRepo from '@/domain/auth/repositories/user-session.repository';
import { hashPassword } from '@/domain/auth/helpers/auth.helpers';
import { randomBytes } from 'crypto';
import { appConfig, sessionConfig } from '@/config/env';

const COOKIE_NAME = 'session_token';

const extractTokenFromRequest = (req: AuthenticatedRequest): string | null => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  const rawCookie = req.headers.cookie;
  if (!rawCookie) return null;

  const cookiePair = rawCookie
    .split(';')
    .map((chunk) => chunk.trim())
    .find((chunk) => chunk.startsWith(`${COOKIE_NAME}=`));

  if (!cookiePair) return null;
  const value = cookiePair.split('=').slice(1).join('=');
  return value ? decodeURIComponent(value) : null;
};

export const login = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw createValidationError('Invalid login data', parsed.error.flatten().fieldErrors);
  }

  const result = await authSessionService.login(parsed.data.username, parsed.data.password);
  res.cookie(COOKIE_NAME, result.token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: appConfig.isProduction,
    path: '/',
    maxAge: sessionConfig.maxLifetimeHours * 60 * 60 * 1000,
  });
  sendOk(res, result);
});

export const logout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const token = extractTokenFromRequest(req);
  if (!token) {
    throw createUnauthorizedError('No token provided');
  }

  await authSessionService.logout(token);
  res.clearCookie(COOKIE_NAME, { path: '/' });
  sendOk(res, { message: 'Logged out successfully' });
});

export const getMe = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw createUnauthorizedError('Not authenticated');
  }

  const token = extractTokenFromRequest(req);
  const user = await authSessionService.getCurrentUser(req.user.id);
  sendOk(res, { user, token });
});

export const changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw createUnauthorizedError('Not authenticated');
  }

  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    throw createValidationError('Invalid password data', parsed.error.flatten().fieldErrors);
  }

  await authPasswordService.changePassword(
    req.user.id,
    parsed.data.currentPassword,
    parsed.data.newPassword,
  );
  sendOk(res, { message: 'Password changed successfully' });
});

export const refresh = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw createUnauthorizedError('Not authenticated');
  }

  const token = extractTokenFromRequest(req);
  if (!token) {
    throw createUnauthorizedError('No token provided');
  }

  const user = await authSessionService.getCurrentUser(req.user.id);
  sendOk(res, { user, token });
});

export const updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw createUnauthorizedError('Not authenticated');
  }

  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    throw createValidationError('Invalid profile data', parsed.error.flatten().fieldErrors);
  }

  const user = await userManagementService.updateProfile(req.user.id, parsed.data);
  sendOk(res, user);
});

export const updateNotifications = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw createUnauthorizedError('Not authenticated');
    }

    const parsed = updateNotificationSchema.safeParse(req.body);
    if (!parsed.success) {
      throw createValidationError(
        'Invalid notification settings',
        parsed.error.flatten().fieldErrors,
      );
    }

    const user = await userManagementService.updateNotificationPreferences(
      req.user.id,
      parsed.data,
    );
    sendOk(res, user);
  },
);

export const getNotificationSettings = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw createUnauthorizedError('Not authenticated');
    }

    const user = await userRepo.findById(req.user.id);
    const preferences = (user?.preferences as Record<string, unknown> | undefined)
      ?.notifications ?? {
      emailAlerts: true,
      pushAlerts: true,
      alertTypes: ['critical', 'high'],
    };
    sendOk(res, { preferences });
  },
);

// --- User Management (Admin) ---

export const listUsers = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const users = await userManagementService.listUsers();
  sendOk(res, users);
});

export const getUserById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid user ID');
  }

  const user = await userManagementService.getUserById(id);
  sendOk(res, user);
});

export const createUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    throw createValidationError('Invalid user data', parsed.error.flatten().fieldErrors);
  }

  const user = await userManagementService.createUser(parsed.data);
  sendCreated(res, user);
});

export const updateUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid user ID');
  }

  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    throw createValidationError('Invalid user data', parsed.error.flatten().fieldErrors);
  }

  const user = await userManagementService.updateUser(id, parsed.data);
  sendOk(res, user);
});

export const deleteUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid user ID');
  }

  await userManagementService.deleteUser(id);
  sendOk(res, { message: 'User deleted successfully' });
});

export const resetUserPassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid user ID');
  }

  const temporaryPassword = `Tmp${randomBytes(12).toString('base64url')}!`;
  const newHash = await hashPassword(temporaryPassword);
  const updated = await userRepo.updatePassword(id, newHash);

  if (!updated) {
    throw createValidationError('Could not reset password');
  }

  await userSessionRepo.deactivateAllForUser(id);

  sendOk(res, { temporaryPassword });
});
