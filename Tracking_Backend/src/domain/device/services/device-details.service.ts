import { createNotFoundError } from '@/shared/utils/errors.util';
import * as deviceRepo from '@/domain/device/repositories/device.repository';
import * as sessionRepo from '@/domain/device/repositories/device-session.repository';
import type { Device, DeviceDetail, DeviceSession, DeviceSessionPublic } from '@/domain/device/types/device.types';

const sanitizeSession = (session: DeviceSession): DeviceSessionPublic => ({
  id: session.id,
  status: session.status,
  serverSessionStart: session.server_session_start?.toISOString() ?? null,
  serverSessionEnd: session.server_session_end?.toISOString() ?? null,
  uptime: session.uptime,
  avgVibration: session.avg_vibration,
  dataPointsCount: session.data_points_count,
});

const toDeviceDetail = (
  device: Device,
  currentSession: DeviceSession | null,
  recentSessions: DeviceSession[],
): DeviceDetail => ({
  id: device.id,
  deviceId: device.device_id,
  deviceName: device.device_name,
  currentStatus: device.current_status,
  lastSeenAt: device.last_seen_at?.toISOString() ?? null,
  totalRuntimeSeconds: device.total_runtime_seconds,
  latitude: device.latitude,
  longitude: device.longitude,
  firmwareVersion: device.firmware_version,
  lastErrorCode: device.last_error_code,
  createdAt: device.created_at.toISOString(),
  imei: device.imei,
  vibrationThreshold: device.vibration_threshold,
  requestInterval: device.request_interval,
  targetFirmwareVersion: device.target_firmware_version,
  config: device.config,
  currentSession: currentSession ? sanitizeSession(currentSession) : null,
  recentSessions: recentSessions.map(sanitizeSession),
});

export const getDeviceDetail = async (id: number): Promise<DeviceDetail> => {
  const device = await deviceRepo.findById(id);
  if (!device) {
    throw createNotFoundError(`Device with ID ${id} not found`);
  }

  const currentSession = await sessionRepo.findCurrentSession(device.device_id);
  const recentSessions = await sessionRepo.findByDeviceId(device.device_id, 10);

  return toDeviceDetail(device, currentSession, recentSessions);
};
