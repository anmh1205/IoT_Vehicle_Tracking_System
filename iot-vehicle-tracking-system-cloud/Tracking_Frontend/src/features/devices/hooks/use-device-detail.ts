import { useQuery } from '@tanstack/react-query';
import { deviceDetailServices } from '@/lib/api/device-detail';
import type { Device, DeviceSession } from '@/features/devices/types';

export interface DeviceDetailData {
  device: Device | null;
  runtime: {
    totalRuntime: number;
    totalSessions: number;
    avgSessionDuration: number;
    avgVibration: number;
    totalDataPoints: number;
  } | null;
  sessions: unknown[];
  commands: unknown[];
  errors: unknown[];
}

const toAlertSummary = (raw: any, source: 'device' | 'ecu'): Device['deviceAlerts'] => ({
  source,
  count: Number(raw?.count ?? 0),
  highestSeverity: (raw?.highestSeverity ?? raw?.highest_severity ?? 'none') as Device['deviceAlerts']['highestSeverity'],
  titles: Array.isArray(raw?.titles) ? raw.titles.map((item: unknown) => String(item ?? '')) : [],
});

const toDeviceSession = (raw: any): DeviceSession => ({
  id: Number(raw?.id ?? 0),
  status: raw?.status ?? 'running',
  serverSessionStart: raw?.serverSessionStart ?? raw?.server_session_start ?? null,
  serverSessionEnd: raw?.serverSessionEnd ?? raw?.server_session_end ?? null,
  uptime: raw?.uptime !== undefined && raw?.uptime !== null ? Number(raw.uptime) : null,
  avgVibration:
    raw?.avgVibration !== undefined && raw?.avgVibration !== null ? Number(raw.avgVibration) : null,
  dataPointsCount: Number(raw?.dataPointsCount ?? raw?.data_points_count ?? 0),
});

const toDevice = (raw: any): Device => ({
  id: Number(raw?.id ?? 0),
  deviceId: String(raw?.deviceId ?? raw?.device_id ?? ''),
  deviceName: String(raw?.deviceName ?? raw?.device_name ?? ''),
  currentStatus: (raw?.currentStatus ??
    raw?.current_status ??
    'disconnected') as Device['currentStatus'],
  ignitionState: (raw?.ignitionState ?? raw?.ignition_state ?? null) as Device['ignitionState'],
  motionState: (raw?.motionState ?? raw?.motion_state ?? null) as Device['motionState'],
  vehicleState: (raw?.vehicleState ?? raw?.vehicle_state ?? null) as Device['vehicleState'],
  deviceState: (raw?.deviceState ?? raw?.device_state ?? null) as Device['deviceState'],
  sleepMode: (raw?.sleepMode ?? raw?.sleep_mode ?? null) as Device['sleepMode'],
  stateUpdatedAt: raw?.stateUpdatedAt ?? raw?.state_updated_at ?? null,
  deviceAlerts: toAlertSummary(raw?.deviceAlerts ?? raw?.device_alerts ?? {}, 'device'),
  ecuAlerts: toAlertSummary(raw?.ecuAlerts ?? raw?.ecu_alerts ?? {}, 'ecu'),
  imei: raw?.imei ?? null,
  firmwareVersion: raw?.firmwareVersion ?? raw?.firmware_version ?? null,
  targetFirmwareVersion: raw?.targetFirmwareVersion ?? raw?.target_firmware_version ?? null,
  vehicleId: raw?.vehicleId ?? raw?.vehicle_id ?? null,
  vehiclePlate: raw?.vehiclePlate ?? raw?.vehicle_plate ?? null,
  customerName: raw?.customerName ?? raw?.customer_name ?? null,
  lastSeenAt: raw?.lastSeenAt ?? raw?.last_seen_at ?? null,
  latitude: raw?.latitude !== undefined ? Number(raw.latitude) : null,
  longitude: raw?.longitude !== undefined ? Number(raw.longitude) : null,
  totalRuntimeSeconds: Number(raw?.totalRuntimeSeconds ?? raw?.total_runtime_seconds ?? 0),
  requestInterval: Number(raw?.requestInterval ?? raw?.request_interval ?? 60),
  vibrationThreshold: Number(raw?.vibrationThreshold ?? raw?.vibration_threshold ?? 0),
  lastErrorCode:
    raw?.lastErrorCode !== undefined && raw?.lastErrorCode !== null
      ? Number(raw.lastErrorCode)
      : raw?.last_error_code !== undefined && raw?.last_error_code !== null
        ? Number(raw.last_error_code)
        : null,
  config: raw?.config ?? null,
  currentSession: raw?.currentSession ? toDeviceSession(raw.currentSession) : null,
  recentSessions: Array.isArray(raw?.recentSessions)
    ? raw.recentSessions.map(toDeviceSession)
    : Array.isArray(raw?.recent_sessions)
      ? raw.recent_sessions.map(toDeviceSession)
      : [],
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
