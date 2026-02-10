import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '@/shared/types/common.types';
import { asyncHandler } from '@/shared/utils/async-handler.util';
import { sendOk, sendCreated } from '@/shared/utils/response.util';
import { createValidationError, createUnauthorizedError } from '@/shared/utils/errors.util';
import {
  loginSchema,
  changePasswordSchema,
  createUserSchema,
  updateUserSchema,
} from '@/api/validators/auth.validator';
import * as authSessionService from '@/domain/auth/services/auth-session.service';
import * as authPasswordService from '@/domain/auth/services/auth-password.service';
import * as userManagementService from '@/domain/auth/services/user-management.service';

export const login = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw createValidationError('Invalid login data', parsed.error.flatten().fieldErrors);
  }

  const result = await authSessionService.login(parsed.data.username, parsed.data.password);
  sendOk(res, result);
});

export const logout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createUnauthorizedError('No token provided');
  }

  const token = authHeader.slice(7);
  await authSessionService.logout(token);
  sendOk(res, { message: 'Logged out successfully' });
});

export const getMe = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw createUnauthorizedError('Not authenticated');
  }

  const user = await authSessionService.getCurrentUser(req.user.id);
  sendOk(res, user);
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

export const deleteUser = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid user ID');
  }

  await userManagementService.deleteUser(id);
  sendOk(res, { message: 'User deleted successfully' });
});
