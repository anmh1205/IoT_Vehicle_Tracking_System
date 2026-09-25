vi.mock('@/domain/device/repositories/device.repository', () => ({
  hasAssignedAccessByDeviceId: vi.fn(),
  hasAssignedAccessByReference: vi.fn(),
}));

import * as deviceRepo from '@/domain/device/repositories/device.repository';
import {
  canAccessDeviceId,
  canAccessDeviceReference,
} from './device-access.service';

describe('device access policy', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('grants root/admin and all-mode users without querying assignments', async () => {
    const admin = {
      id: 1,
      username: 'admin',
      role: 'admin',
      deviceAccessMode: 'assigned',
    } as const;
    const allMode = {
      id: 2,
      username: 'manager',
      role: 'manager',
      deviceAccessMode: 'all',
    } as const;

    expect(await canAccessDeviceId(admin, 'DEVICE_001')).toBe(true);
    expect(await canAccessDeviceReference(allMode, '42')).toBe(true);
    expect(deviceRepo.hasAssignedAccessByDeviceId).not.toHaveBeenCalled();
    expect(deviceRepo.hasAssignedAccessByReference).not.toHaveBeenCalled();
  });

  it('uses explicit assignments for limited users', async () => {
    vi.mocked(deviceRepo.hasAssignedAccessByDeviceId).mockResolvedValue(true);
    vi.mocked(deviceRepo.hasAssignedAccessByReference).mockResolvedValue(false);

    const viewer = {
      id: 7,
      username: 'viewer',
      role: 'viewer',
      deviceAccessMode: 'assigned',
    } as const;

    expect(await canAccessDeviceId(viewer, 'DEVICE_001')).toBe(true);
    expect(await canAccessDeviceReference(viewer, '42')).toBe(false);
    expect(deviceRepo.hasAssignedAccessByDeviceId).toHaveBeenCalledWith(7, 'DEVICE_001');
    expect(deviceRepo.hasAssignedAccessByReference).toHaveBeenCalledWith(7, '42');
  });
});
