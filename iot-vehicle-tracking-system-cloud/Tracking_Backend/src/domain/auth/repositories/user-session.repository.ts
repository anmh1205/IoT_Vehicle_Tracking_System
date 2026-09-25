import { findOne, insertOne, executeQuery } from '@/infrastructure/database/queries';
import type { UserSession } from '@/domain/auth/types/auth.types';

export const create = async (
  userId: number,
  hashedToken: string,
  expiresAt: Date,
): Promise<UserSession> =>
  insertOne<UserSession>(
    `INSERT INTO user_sessions (user_id, session_token, login_at, expires_at, is_active)
     VALUES ($1, $2, NOW(), $3, true)
     RETURNING *`,
    [userId, hashedToken, expiresAt],
  );

export const findByHashedToken = async (hashedToken: string): Promise<UserSession | null> =>
  findOne<UserSession>(
    'SELECT * FROM user_sessions WHERE session_token = $1 AND is_active = true AND expires_at > NOW()',
    [hashedToken],
  );

export const deactivate = async (hashedToken: string): Promise<boolean> => {
  const count = await executeQuery(
    'UPDATE user_sessions SET is_active = false WHERE session_token = $1',
    [hashedToken],
  );
  return count > 0;
};

export const deactivateAllForUser = async (userId: number): Promise<number> =>
  executeQuery(
    'UPDATE user_sessions SET is_active = false WHERE user_id = $1 AND is_active = true',
    [userId],
  );

export const extendSession = async (
  sessionId: number,
  extensionHours: number,
  maxLifetimeHours: number,
): Promise<boolean> => {
  const count = await executeQuery(
    `UPDATE user_sessions
     SET expires_at = LEAST(
       login_at + INTERVAL '1 hour' * $2,
       GREATEST(expires_at, NOW() + INTERVAL '1 hour' * $1)
     )
     WHERE id = $3 AND is_active = true`,
    [extensionHours, maxLifetimeHours, sessionId],
  );
  return count > 0;
};

export const cleanupExpired = async (): Promise<number> =>
  executeQuery(
    'UPDATE user_sessions SET is_active = false WHERE expires_at < NOW() AND is_active = true',
  );
