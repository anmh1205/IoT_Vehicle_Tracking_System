import { generateToken, hashToken } from '@/shared/utils/crypto.util';
import { createApiError, createUnauthorizedError } from '@/shared/utils/errors.util';
import { verifyPassword, sanitizeUser } from '@/domain/auth/helpers/auth.helpers';
import * as userRepo from '@/domain/auth/repositories/user.repository';
import * as sessionRepo from '@/domain/auth/repositories/user-session.repository';
import { sessionConfig } from '@/config/env';
import { logger } from '@/infrastructure/logger';
import type { LoginResponse, UserPublic } from '@/domain/auth/types/auth.types';

type DbLikeError = {
  code?: string;
  message?: string;
};

const isDbUnavailableError = (error: DbLikeError): boolean => {
  const code = String(error.code ?? '').toUpperCase();
  const message = String(error.message ?? '').toLowerCase();

  return (
    code.startsWith('08') ||
    code === '57P01' ||
    code === '57P03' ||
    code === '53300' ||
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    code === 'ENOTFOUND' ||
    code === 'EAI_AGAIN' ||
    message.includes('getaddrinfo') ||
    message.includes('connect') ||
    message.includes('connection') ||
    message.includes('timeout') ||
    message.includes('econnrefused')
  );
};

const mapLoginDbError = (phase: 'find-user' | 'create-session', error: unknown) => {
  const dbError = error as DbLikeError;
  const sanitizedDbMessage = typeof dbError.message === 'string' ? dbError.message.slice(0, 160) : undefined;

  logger.error('Auth login database operation failed', {
    phase,
    dbCode: dbError.code,
    dbMessage: sanitizedDbMessage,
  });

  if (isDbUnavailableError(dbError)) {
    return createApiError(503, 'Authentication service temporarily unavailable', {
      code: 'AUTH_DB_UNAVAILABLE',
      phase,
    });
  }

  return createApiError(500, 'Authentication database query failed', {
    code: 'AUTH_DB_QUERY_FAILED',
    phase,
  });
};

export const login = async (username: string, password: string): Promise<LoginResponse> => {
  const user = await userRepo.findByUsername(username).catch((error: unknown) => {
    throw mapLoginDbError('find-user', error);
  });

  if (!user) {
    throw createUnauthorizedError('Invalid username or password');
  }

  if (user.status !== 'active') {
    throw createUnauthorizedError('Account is not active');
  }

  if (!user.password_hash || typeof user.password_hash !== 'string') {
    throw createUnauthorizedError('Invalid username or password');
  }

  let isValid = false;
  try {
    isValid = await verifyPassword(password, user.password_hash);
  } catch {
    throw createUnauthorizedError('Invalid username or password');
  }

  if (!isValid) {
    throw createUnauthorizedError('Invalid username or password');
  }

  const plainToken = generateToken();
  const hashedToken = hashToken(plainToken);
  const expiresAt = new Date(Date.now() + sessionConfig.maxLifetimeHours * 60 * 60 * 1000);

  try {
    await sessionRepo.create(user.id, hashedToken, expiresAt);
  } catch (error) {
    throw mapLoginDbError('create-session', error);
  }

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
