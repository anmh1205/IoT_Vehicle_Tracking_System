import { createNotFoundError } from '@/shared/utils/errors.util';
import * as deviceRepo from '@/domain/device/repositories/device.repository';
import * as sessionRepo from '@/domain/device/repositories/device-session.repository';
import type {
  RuntimeStats,
  DeviceSession,
  DeviceSessionPublic,
} from '@/domain/device/types/device.types';

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
  gpsPointsCount: session.gps_points_count ?? 0,
});

export const getRuntimeStats = async (deviceId: string): Promise<RuntimeStats> => {
  const device = await deviceRepo.findByDeviceId(deviceId);
  if (!device) {
    throw createNotFoundError(`Device "${deviceId}" not found`);
  }

  const stats = await sessionRepo.getSessionStats(deviceId);
  const [currentSession, recentSessions] = await Promise.all([
    sessionRepo.findCurrentSession(deviceId),
    sessionRepo.findByDeviceId(deviceId, 1),
  ]);
  const lastSession = recentSessions.length > 0 ? sanitizeSession(recentSessions[0]) : null;
  const activeRuntimeSeconds =
    currentSession?.server_session_start != null
      ? Math.max(
          Math.floor((Date.now() - currentSession.server_session_start.getTime()) / 1000),
          currentSession.uptime ?? 0,
        )
      : 0;

  return {
    totalRuntime: Math.max(device.total_runtime_seconds ?? 0, 0) + activeRuntimeSeconds,
    totalSessions: stats.totalSessions,
    avgSessionDuration: stats.avgUptime,
    avgImuAccelDeltaMps2: stats.avgImuAccelDeltaMps2,
    totalDataPoints: stats.totalDataPoints,
    lastSession,
  };
};
