vi.mock('@/domain/device/services/device-access.service', () => ({
  canAccessDeviceReference: vi.fn(),
}));

import { canAccessDeviceReference } from '@/domain/device/services/device-access.service';
import { requireDeviceAccess } from './device-access.middleware';

describe('requireDeviceAccess', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const user = {
    id: 7,
    username: 'viewer',
    role: 'viewer',
    deviceAccessMode: 'assigned',
  } as const;

  it('allows an assigned device', async () => {
    vi.mocked(canAccessDeviceReference).mockResolvedValue(true);
    const next = vi.fn();

    await requireDeviceAccess(
      { user, params: { id: 'DEVICE_001' } } as any,
      {} as any,
      next,
    );

    expect(canAccessDeviceReference).toHaveBeenCalledWith(user, 'DEVICE_001');
    expect(next).toHaveBeenCalledWith();
  });

  it('returns forbidden for an unassigned device', async () => {
    vi.mocked(canAccessDeviceReference).mockResolvedValue(false);
    const next = vi.fn();

    await requireDeviceAccess(
      { user, params: { id: 'DEVICE_999' } } as any,
      {} as any,
      next,
    );

    expect(next.mock.calls[0]?.[0]).toMatchObject({
      status: 403,
      message: 'Device access denied',
    });
  });

  it('requires authentication', async () => {
    const next = vi.fn();

    await requireDeviceAccess(
      { params: { id: 'DEVICE_001' } } as any,
      {} as any,
      next,
    );

    expect(next.mock.calls[0]?.[0]).toMatchObject({ status: 401 });
    expect(canAccessDeviceReference).not.toHaveBeenCalled();
  });
});
