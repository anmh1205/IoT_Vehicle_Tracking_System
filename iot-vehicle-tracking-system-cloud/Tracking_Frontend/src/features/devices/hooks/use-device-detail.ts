import { useQuery } from '@tanstack/react-query';
import { deviceDetailServices } from '@/lib/api/device-detail';
import type { Device, DeviceSession } from '@/features/devices/types';

export interface DeviceDetailData {
  device: Device | null;
  runtime: {
    totalRuntime: number;
    totalSessions: number;
    avgSessionDuration: number;
    avgImuAccelDeltaMps2: number;
    totalDataPoints: number;
  } | null;
  sessions: unknown[];
  commands: unknown[];
  errors: unknown[];
}

const toAlertSummary = (raw: any, source: 'device' | 'ecu'): Device['deviceAlerts'] => ({
  source,
  count: Number(raw?.count ?? 0),
  highestSeverity: (raw?.highestSeverity ?? 'none') as Device['deviceAlerts']['highestSeverity'],
  titles: Array.isArray(raw?.titles) ? raw.titles.map((item: unknown) => String(item ?? '')) : [],
});

const toOptionalNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toDeviceSession = (raw: any): DeviceSession => ({
  id: Number(raw?.id ?? 0),
  status: raw?.status ?? 'running',
  serverSessionStart: raw?.serverSessionStart ?? raw?.server_session_start ?? null,
  serverSessionEnd: raw?.serverSessionEnd ?? raw?.server_session_end ?? null,
  sessionStart: raw?.sessionStart ?? raw?.session_start ?? null,
  sessionEnd: raw?.sessionEnd ?? raw?.session_end ?? null,
  localSessionKey: toOptionalNumber(raw?.localSessionKey ?? raw?.local_session_key),
  firmwareBootId: raw?.firmwareBootId ?? raw?.firmware_boot_id ?? null,
  canonicalSource: raw?.canonicalSource ?? raw?.canonical_source ?? null,
  boundarySource: raw?.boundarySource ?? raw?.boundary_source ?? null,
  startReason: raw?.startReason ?? raw?.start_reason ?? null,
  endReason: raw?.endReason ?? raw?.end_reason ?? null,
  uptime: toOptionalNumber(raw?.uptime),
  avgImuAccelDeltaMps2: toOptionalNumber(
    raw?.avgImuAccelDeltaMps2 ?? raw?.avg_imu_accel_delta_mps2 ?? raw?.avgVibration,
  ),
  dataPointsCount: Number(raw?.dataPointsCount ?? raw?.data_points_count ?? 0),
  gpsPointsCount: Number(
    raw?.gpsPointsCount ?? raw?.gps_points_count ?? raw?.dataPointsCount ?? raw?.data_points_count ?? 0,
  ),
});

const toDevice = (raw: any): Device => ({
  id: Number(raw?.id ?? 0),
  deviceId: String(raw?.deviceId ?? ''),
  deviceName: String(raw?.deviceName ?? ''),
  currentStatus: (raw?.currentStatus ?? 'disconnected') as Device['currentStatus'],
  ignitionState: (raw?.ignitionState ?? null) as Device['ignitionState'],
  motionState: (raw?.motionState ?? null) as Device['motionState'],
  vehicleState: (raw?.vehicleState ?? null) as Device['vehicleState'],
  deviceState: (raw?.deviceState ?? null) as Device['deviceState'],
  sleepMode: (raw?.sleepMode ?? null) as Device['sleepMode'],
  stateUpdatedAt: raw?.stateUpdatedAt ?? null,
  deviceAlerts: toAlertSummary(raw?.deviceAlerts ?? {}, 'device'),
  ecuAlerts: toAlertSummary(raw?.ecuAlerts ?? {}, 'ecu'),
  imei: raw?.imei ?? null,
  firmwareVersion: raw?.firmwareVersion ?? null,
  targetFirmwareVersion: raw?.targetFirmwareVersion ?? null,
  vehicleId: raw?.vehicleId ?? null,
  vehiclePlate: raw?.vehiclePlate ?? null,
  customerName: raw?.customerName ?? null,
  lastSeenAt: raw?.lastSeenAt ?? null,
  latitude: raw?.latitude !== undefined ? Number(raw.latitude) : null,
  longitude: raw?.longitude !== undefined ? Number(raw.longitude) : null,
  totalRuntimeSeconds: Number(raw?.totalRuntimeSeconds ?? 0),
  requestInterval: Number(raw?.requestInterval ?? 60),
  imuAccelDeltaThresholdMps2: Number(
    raw?.imuAccelDeltaThresholdMps2 ??
      raw?.imu_accel_delta_threshold_mps2 ??
      raw?.vibrationThreshold ??
      0,
  ),
  lastErrorCode: raw?.lastErrorCode !== undefined && raw?.lastErrorCode !== null
    ? Number(raw.lastErrorCode)
    : null,
  config: raw?.config ?? null,
  currentSession: raw?.currentSession ? toDeviceSession(raw.currentSession) : null,
  recentSessions: Array.isArray(raw?.recentSessions) ? raw.recentSessions.map(toDeviceSession) : [],
});

export const useDeviceDetail = (id: number | null) =>
  useQuery({
    queryKey: ['device-detail', id],
    queryFn: () =>
      deviceDetailServices.getAggregate(id as number).then(
        (payload): DeviceDetailData => ({
          device: payload.device ? toDevice(payload.device) : null,
          runtime: payload.runtime,
          sessions: payload.sessions ?? [],
          commands: payload.commands ?? [],
          errors: payload.errors ?? [],
        }),
      ),
    enabled: id !== null,
  });
