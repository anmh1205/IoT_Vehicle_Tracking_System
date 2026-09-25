import type { TypedSocket } from './types';
import { isUserRole } from '@/shared/types/common.types';
import { hashToken } from '@/shared/utils/crypto.util';
import { findByHashedToken } from '@/domain/auth/repositories/user-session.repository';
import { findById } from '@/domain/auth/repositories/user.repository';
import { createLogger } from '@/infrastructure/logger';

const log = createLogger('socket-auth');

const extractToken = (socket: TypedSocket): string | null => {
  const { auth, query, headers } = socket.handshake;

  if (auth?.token && typeof auth.token === 'string') {
    return auth.token;
  }

  if (query?.token && typeof query.token === 'string') {
    return query.token;
  }

  const authHeader = headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return null;
};

export const socketAuthMiddleware = async (
  socket: TypedSocket,
  next: (err?: Error) => void,
): Promise<void> => {
  try {
    const token = extractToken(socket);
    if (!token) {
      next(new Error('Authentication required'));
      return;
    }

    const hashedToken = hashToken(token);
    const session = await findByHashedToken(hashedToken);

    if (!session || !session.is_active) {
      next(new Error('Invalid or expired session'));
      return;
    }

    if (new Date(session.expires_at) < new Date()) {
      next(new Error('Session has expired'));
      return;
    }

    const user = await findById(session.user_id);
    if (!user) {
      next(new Error('User not found'));
      return;
    }

    if (user.status !== 'active') {
      next(new Error('Account is not active'));
      return;
    }

    if (!isUserRole(user.role)) {
      next(new Error('Invalid user role'));
      return;
    }

    socket.data.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      deviceAccessMode: user.device_access_mode,
    };
    socket.data.authToken = token;
    socket.data.activeRooms = new Set();

    log.debug('Socket authenticated', {
      socketId: socket.id,
      userId: user.id,
      username: user.username,
    });

    next();
  } catch (err) {
    log.warn('Socket authentication failed', {
      socketId: socket.id,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    next(new Error('Authentication failed'));
  }
};
