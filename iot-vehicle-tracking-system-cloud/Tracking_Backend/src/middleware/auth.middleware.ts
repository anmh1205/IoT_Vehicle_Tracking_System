import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest, UserRole } from '@/shared/types/common.types';
import { isUserRole } from '@/shared/types/common.types';
import { hashToken } from '@/shared/utils/crypto.util';
import { createUnauthorizedError, createForbiddenError } from '@/shared/utils/errors.util';
import {
  findByHashedToken,
  extendSession,
} from '@/domain/auth/repositories/user-session.repository';
import { findById } from '@/domain/auth/repositories/user.repository';
import { sessionConfig } from '@/config/env';

const extractBearerToken = (req: AuthenticatedRequest): string | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
};

const extractCookieToken = (req: AuthenticatedRequest): string | null => {
  const rawCookie = req.headers.cookie;
  if (!rawCookie) return null;

  const cookiePair = rawCookie
    .split(';')
    .map((chunk) => chunk.trim())
    .find((chunk) => chunk.startsWith('session_token='));

  if (!cookiePair) return null;
  const value = cookiePair.split('=').slice(1).join('=');
  return value ? decodeURIComponent(value) : null;
};

const extractSessionToken = (req: AuthenticatedRequest): string | null =>
  extractBearerToken(req) ?? extractCookieToken(req);

export const requireRole = (...allowedRoles: UserRole[]) =>
  (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction,
  ): void => {
    if (!req.user) {
      next(createUnauthorizedError('Authentication required'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(createForbiddenError('Insufficient permissions'));
      return;
    }

    next();
  };

export const requireAdminRole = requireRole('root', 'admin');

export const requireAuth = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = extractSessionToken(req);
    if (!token) {
      throw createUnauthorizedError('Authentication required');
    }

    const hashedToken = hashToken(token);
    const session = await findByHashedToken(hashedToken);

    if (!session || !session.is_active) {
      throw createUnauthorizedError('Invalid or expired session');
    }

    if (new Date(session.expires_at) < new Date()) {
      throw createUnauthorizedError('Session has expired');
    }

    const user = await findById(session.user_id);
    if (!user) {
      throw createUnauthorizedError('User not found');
    }

    if (user.status !== 'active') {
      throw createUnauthorizedError('Account is not active');
    }

    if (!isUserRole(user.role)) {
      throw createUnauthorizedError('Invalid user role');
    }

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      deviceAccessMode: user.device_access_mode,
    };

    // Sliding window: extend session
    await extendSession(
      session.id,
      sessionConfig.extensionHours,
      sessionConfig.maxLifetimeHours,
    );

    next();
  } catch (err) {
    next(err);
  }
};

export const attachUserIfAvailable = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = extractSessionToken(req);
    if (!token) {
      next();
      return;
    }

    const hashedToken = hashToken(token);
    const session = await findByHashedToken(hashedToken);

    if (!session || !session.is_active || new Date(session.expires_at) < new Date()) {
      next();
      return;
    }

    const user = await findById(session.user_id);
    if (user && user.status === 'active' && isUserRole(user.role)) {
      req.user = {
        id: user.id,
        username: user.username,
        role: user.role,
        deviceAccessMode: user.device_access_mode,
      };
      await extendSession(
        session.id,
        sessionConfig.extensionHours,
        sessionConfig.maxLifetimeHours,
      );
    }

    next();
  } catch {
    // Silently continue without user if lookup fails
    next();
  }
};
