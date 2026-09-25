vi.mock('@/shared/utils/crypto.util', () => ({
  hashToken: vi.fn(() => 'hashed-token'),
}));

vi.mock('@/domain/auth/repositories/user-session.repository', () => ({
  findByHashedToken: vi.fn(),
}));

vi.mock('@/domain/auth/repositories/user.repository', () => ({
  findById: vi.fn(),
}));

vi.mock('@/infrastructure/logger', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    warn: vi.fn(),
  })),
}));

import { findByHashedToken } from '@/domain/auth/repositories/user-session.repository';
import { findById } from '@/domain/auth/repositories/user.repository';
import { socketAuthMiddleware } from './socket-auth.middleware';

describe('socket auth account status', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(findByHashedToken).mockResolvedValue({
      id: 11,
      user_id: 7,
      is_active: true,
      expires_at: new Date(Date.now() + 60_000),
    } as any);
    vi.mocked(findById).mockResolvedValue({
      id: 7,
      username: 'suspended-user',
      role: 'viewer',
      status: 'suspended',
      device_access_mode: 'assigned',
    } as any);
  });

  it('rejects a suspended user even when the session is still active', async () => {
    const socket = {
      id: 'socket-1',
      handshake: {
        auth: { token: 'token' },
        query: {},
        headers: {},
      },
      data: {},
    } as any;
    const next = vi.fn();

    await socketAuthMiddleware(socket, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0]?.[0]).toMatchObject({
      message: 'Account is not active',
    });
    expect(socket.data.user).toBeUndefined();
  });
});
