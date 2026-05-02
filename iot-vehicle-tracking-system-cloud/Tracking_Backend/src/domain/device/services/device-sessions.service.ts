import { createNotFoundError } from '@/shared/utils/errors.util';
import * as deviceRepo from '@/domain/device/repositories/device.repository';
import * as sessionRepo from '@/domain/device/repositories/device-session.repository';
import type { DeviceSession, DeviceSessionPublic } from '@/domain/device/types/device.types';

const sanitizeSession = (session: DeviceSession): DeviceSessionPublic => ({
  id: session.id,
  status: session.status,
  serverSessionStart: session.server_session_start?.toISOString() ?? null,
  serverSessionEnd: session.server_session_end?.toISOString() ?? null,
  sessionStart: session.session_start?.toISOString() ?? null,
  sessionEnd: session.session_end?.toISOString() ?? null,
  localSessionKey: session.local_session_key,
  firmwareBootId: session.firmware_boot_id,
  canonicalSource: session.canonical_source,
  boundarySource: session.boundary_source,
  startReason: session.start_reason,
  endReason: session.end_reason,
  uptime: session.uptime,
  avgImuAccelDeltaMps2: session.avg_imu_accel_delta_mps2 ?? session.avg_vibration ?? null,
  dataPointsCount: session.data_points_count,
});

export const getDeviceSessions = async (
  deviceId: string,
  page = 1,
  limit = 20,
): Promise<{ sessions: DeviceSessionPublic[]; total: number; page: number; limit: number }> => {
  const device = await deviceRepo.findByDeviceId(deviceId);
  if (!device) {
    throw createNotFoundError(`Device "${deviceId}" not found`);
  }

  const total = await sessionRepo.countByDeviceId(deviceId);
  const sessions = await sessionRepo.findByDeviceIdPaginated(deviceId, page, limit);

  return {
    sessions: sessions.map(sanitizeSession),
    total,
    page,
    limit,
  };
};
