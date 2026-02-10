import { generateToken, hashToken } from '@/shared/utils/crypto.util';
import { createUnauthorizedError } from '@/shared/utils/errors.util';
import { verifyPassword, sanitizeUser } from '@/domain/auth/helpers/auth.helpers';
import * as userRepo from '@/domain/auth/repositories/user.repository';
import * as sessionRepo from '@/domain/auth/repositories/user-session.repository';
import { sessionConfig } from '@/config/env';
import { logger } from '@/infrastructure/logger';
import type { LoginResponse, UserPublic } from '@/domain/auth/types/auth.types';

export const login = async (username: string, password: string): Promise<LoginResponse> => {
  const user = await userRepo.findByUsername(username);
  if (!user) {
    throw createUnauthorizedError('Invalid username or password');
  }

  if (user.status !== 'active') {
    throw createUnauthorizedError('Account is not active');
  }

  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) {
    throw createUnauthorizedError('Invalid username or password');
  }

  const plainToken = generateToken();
  const hashedToken = hashToken(plainToken);
  const expiresAt = new Date(Date.now() + sessionConfig.maxLifetimeHours * 60 * 60 * 1000);

  await sessionRepo.create(user.id, hashedToken, expiresAt);

  logger.info(`User "${username}" logged in successfully`);

  return {
    user: sanitizeUser(user),
    token: plainToken,
    expiresAt,
  };
};

export const logout = async (token: string): Promise<void> => {
  const hashedToken = hashToken(token);
  await sessionRepo.deactivate(hashedToken);
  logger.info('Session deactivated');
};

export const validateSession = async (hashedToken: string): Promise<UserPublic | null> => {
  const session = await sessionRepo.findByHashedToken(hashedToken);
  if (!session || !session.is_active || new Date(session.expires_at) < new Date()) {
    return null;
  }

  const user = await userRepo.findById(session.user_id);
  if (!user) return null;

  return sanitizeUser(user);
};

export const getCurrentUser = async (userId: number): Promise<UserPublic> => {
  const user = await userRepo.findById(userId);
  if (!user) {
    throw createUnauthorizedError('User not found');
  }
  return sanitizeUser(user);
};
