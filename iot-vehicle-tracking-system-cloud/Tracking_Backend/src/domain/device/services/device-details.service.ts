import { createNotFoundError } from '@/shared/utils/errors.util';
import * as deviceRepo from '@/domain/device/repositories/device.repository';
import * as sessionRepo from '@/domain/device/repositories/device-session.repository';
import type {
  Device,
  DeviceDetail,
  DeviceSession,
  DeviceSessionPublic,
} from '@/domain/device/types/device.types';

const toAlertSummary = (
  source: 'device' | 'ecu',
  count: number | null | undefined,
  highestSeverity: Device['device_alert_highest_severity'] | Device['ecu_alert_highest_severity'],
  titles: string[] | null | undefined,
) => ({
  source,
  count: count ?? 0,
  highestSeverity: highestSeverity ?? 'none',
  titles: titles ?? [],
});

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

const toDeviceDetail = (
  device: Device,
  currentSession: DeviceSession | null,
  recentSessions: DeviceSession[],
): DeviceDetail => ({
  id: device.id,
  deviceId: device.device_id,
  deviceName: device.device_name,
  currentStatus: device.current_status,
  ignitionState: device.ignition_state,
  motionState: device.motion_state,
  vehicleState: device.vehicle_state,
  deviceState: device.device_state,
  sleepMode: device.sleep_mode,
  stateUpdatedAt: device.state_updated_at?.toISOString() ?? null,
  deviceAlerts: toAlertSummary(
    'device',
    device.device_alert_count,
    device.device_alert_highest_severity,
    device.device_alert_titles,
  ),
  ecuAlerts: toAlertSummary(
    'ecu',
    device.ecu_alert_count,
    device.ecu_alert_highest_severity,
    device.ecu_alert_titles,
  ),
  lastSeenAt: device.last_seen_at?.toISOString() ?? null,
  totalRuntimeSeconds: device.total_runtime_seconds,
  latitude: device.latitude,
  longitude: device.longitude,
  firmwareVersion: device.firmware_version,
  lastErrorCode: device.last_error_code,
  createdAt: device.created_at.toISOString(),
  vehiclePlate: device.vehicle_plate ?? null,
  customerName: device.customer_name ?? null,
  vehicleId: device.linked_vehicle_id ?? null,
  imei: device.imei,
  imuAccelDeltaThresholdMps2:
    device.imu_accel_delta_threshold_mps2 ?? device.vibration_threshold ?? 0,
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
