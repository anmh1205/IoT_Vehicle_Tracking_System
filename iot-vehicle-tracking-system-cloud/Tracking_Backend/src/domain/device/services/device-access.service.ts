import type { SessionUser } from '@/shared/types/common.types';
import * as deviceRepo from '@/domain/device/repositories/device.repository';

const GLOBAL_DEVICE_ACCESS_ROLES = new Set(['root', 'admin']);

export const hasGlobalDeviceAccess = (user: SessionUser): boolean =>
  GLOBAL_DEVICE_ACCESS_ROLES.has(user.role) || user.deviceAccessMode === 'all';

export const canAccessDeviceId = async (
  user: SessionUser,
  deviceId: string,
): Promise<boolean> => {
  if (hasGlobalDeviceAccess(user)) {
    return true;
  }

  return deviceRepo.hasAssignedAccessByDeviceId(user.id, deviceId);
};

export const canAccessDeviceReference = async (
  user: SessionUser,
  rawId: string,
): Promise<boolean> => {
  if (hasGlobalDeviceAccess(user)) {
    return true;
  }

  return deviceRepo.hasAssignedAccessByReference(user.id, rawId);
};
