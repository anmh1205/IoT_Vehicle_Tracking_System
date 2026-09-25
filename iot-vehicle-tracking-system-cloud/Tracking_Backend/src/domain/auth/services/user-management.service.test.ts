vi.mock('@/domain/auth/helpers/auth.helpers', () => ({
  hashPassword: vi.fn(),
  sanitizeUser: vi.fn((user) => user),
}));

vi.mock('@/domain/auth/repositories/user.repository', () => ({
  findById: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@/domain/auth/repositories/user-session.repository', () => ({
  deactivateAllForUser: vi.fn(),
}));

vi.mock('@/infrastructure/realtime', () => ({
  publishEvent: vi.fn(),
}));

vi.mock('@/infrastructure/logger', () => ({
  logger: {
    info: vi.fn(),
  },
}));

import * as userRepo from '@/domain/auth/repositories/user.repository';
import * as sessionRepo from '@/domain/auth/repositories/user-session.repository';
import { publishEvent } from '@/infrastructure/realtime';
import { updateUser } from './user-management.service';

const existingUser = {
  id: 7,
  username: 'operator',
  full_name: 'Operator',
  role: 'operator',
  device_access_mode: 'all',
  status: 'active',
  email: null,
  avatar_url: null,
};

describe('user-management access revocation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(userRepo.findById).mockResolvedValue(existingUser as any);
    vi.mocked(userRepo.update).mockImplementation(async (_id, fields) => ({
      ...existingUser,
      ...fields,
    }) as any);
    vi.mocked(sessionRepo.deactivateAllForUser).mockResolvedValue(1);
  });

  it.each([
    [{ status: 'suspended' }, 'status'],
    [{ role: 'viewer' }, 'role'],
    [{ deviceAccessMode: 'assigned' }, 'device access'],
  ] as const)('revokes sessions when %s changes (%s)', async (input) => {
    await updateUser(7, input as any);

    expect(sessionRepo.deactivateAllForUser).toHaveBeenCalledWith(7);
    expect(publishEvent).toHaveBeenCalledWith('auth:access-revoked', { userId: 7 });
  });

  it('does not revoke sessions for a profile-only change', async () => {
    await updateUser(7, { fullName: 'Updated Operator' } as any);

    expect(sessionRepo.deactivateAllForUser).not.toHaveBeenCalled();
    expect(publishEvent).not.toHaveBeenCalled();
  });
});
