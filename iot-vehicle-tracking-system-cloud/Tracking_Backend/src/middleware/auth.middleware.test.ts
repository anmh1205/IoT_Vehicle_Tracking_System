vi.mock('@/shared/utils/crypto.util', () => ({
  hashToken: vi.fn(() => 'hashed-token'),
}));

vi.mock('@/domain/auth/repositories/user-session.repository', () => ({
  findByHashedToken: vi.fn(),
  extendSession: vi.fn(),
}));

vi.mock('@/domain/auth/repositories/user.repository', () => ({
  findById: vi.fn(),
}));

import { findByHashedToken, extendSession } from '@/domain/auth/repositories/user-session.repository';
import { findById } from '@/domain/auth/repositories/user.repository';
import { requireAuth, attachUserIfAvailable, requireRole } from './auth.middleware';

describe('auth middleware account status', () => {
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

  it('rejects a valid session when the account is no longer active', async () => {
    const req = {
      headers: { authorization: 'Bearer token' },
    } as any;
    const next = vi.fn();

    await requireAuth(req, {} as any, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0]?.[0]).toMatchObject({
      message: 'Account is not active',
    });
    expect(req.user).toBeUndefined();
    expect(extendSession).not.toHaveBeenCalled();
  });

  it('does not attach a suspended user on optional auth', async () => {
    const req = {
      headers: { authorization: 'Bearer token' },
    } as any;
    const next = vi.fn();

    await attachUserIfAvailable(req, {} as any, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toBeUndefined();
    expect(extendSession).not.toHaveBeenCalled();
  });
});


describe('requireRole', () => {
  it('allows a configured role', () => {
    const next = vi.fn();
    const middleware = requireRole('root', 'admin', 'manager', 'operator');

    middleware(
      {
        user: {
          id: 7,
          username: 'operator',
          role: 'operator',
          deviceAccessMode: 'assigned',
        },
      } as any,
      {} as any,
      next,
    );

    expect(next).toHaveBeenCalledWith();
  });

  it('rejects a role outside the allowed capability set', () => {
    const next = vi.fn();
    const middleware = requireRole('root', 'admin', 'manager', 'operator');

    middleware(
      {
        user: {
          id: 8,
          username: 'viewer',
          role: 'viewer',
          deviceAccessMode: 'assigned',
        },
      } as any,
      {} as any,
      next,
    );

    expect(next.mock.calls[0]?.[0]).toMatchObject({
      status: 403,
      message: 'Insufficient permissions',
    });
  });

  it('rejects missing authentication', () => {
    const next = vi.fn();
    requireRole('root', 'admin')({} as any, {} as any, next);

    expect(next.mock.calls[0]?.[0]).toMatchObject({ status: 401 });
  });
});
