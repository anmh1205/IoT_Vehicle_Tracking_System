import type { Device, DevicePositionSnapshot, DeviceTelemetryRow } from '@/features/devices/types';
import type { ObdDiagnosticsSnapshot } from './obd-diagnostics';

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const pickNumber = (sources: unknown[], fallback: number | null = null): number | null => {
  for (const source of sources) {
    const parsed = Number(source);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return fallback;
};

export interface DeviceConfigSummary {
  drivingIntervalSec: number | null;
  parkingIntervalSec: number | null;
  parkingHeartbeatSec: number | null;
  overspeedKph: number | null;
  vibrationThreshold: number | null;
  offlineAfterSec: number | null;
  activeIntervalSec: number | null;
  activeProfileLabel: string;
  activeProfileHint: string;
}

export const getDeviceConfigSummary = (
  device: Pick<Device, 'config' | 'requestInterval' | 'currentStatus' | 'vibrationThreshold'> | null,
): DeviceConfigSummary => {
  const config = toRecord(device?.config);
  const driving = toRecord(config?.driving);
  const parking = toRecord(config?.parking);
  const alerts = toRecord(config?.alerts);
  const drivingIntervalSec = pickNumber(
    [driving?.trackingIntervalSec, driving?.tracking_interval_s, device?.requestInterval],
    60,
  );
  const parkingIntervalSec = pickNumber(
    [parking?.trackingIntervalSec, parking?.tracking_interval_s],
    300,
  );
  const parkingHeartbeatSec = pickNumber(
    [parking?.heartbeatIntervalSec, parking?.heartbeat_interval_s],
    900,
  );
  const overspeedKph = pickNumber([alerts?.overspeedKph, alerts?.overspeed_kph], 80);
  const vibrationThreshold = pickNumber(
    [alerts?.vibrationThreshold, alerts?.vibration_threshold, device?.vibrationThreshold],
    2,
  );
  const offlineAfterSec = pickNumber(
    [alerts?.offlineAfterSec, alerts?.offline_after_s],
    900,
  );
  const isDriving = device?.currentStatus === 'running' || device?.currentStatus === 'online';

  return {
    drivingIntervalSec,
    parkingIntervalSec,
    parkingHeartbeatSec,
    overspeedKph,
    vibrationThreshold,
    offlineAfterSec,
    activeIntervalSec: isDriving ? drivingIntervalSec : parkingIntervalSec,
    activeProfileLabel: isDriving ? 'Chạy xe' : 'Đỗ xe',
    activeProfileHint: isDriving
      ? 'Thiết bị đang ở trạng thái chạy nên cloud dùng chu kỳ driving.'
      : 'Thiết bị không chạy nên cloud dùng chu kỳ parking để giảm tiêu thụ.',
  };
};

export const formatElectricalMetric = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) {
    return '-';
  }

  if (value > 24) {
    return `${value.toFixed(1)}%`;
  }

  return `${value.toFixed(1)} V`;
};

export const formatTemperatureMetric = (value: number | null | undefined): string =>
  value === null || value === undefined || !Number.isFinite(value) ? '-' : `${value.toFixed(1)}°C`;

export const resolveDeviceBatteryValue = (
  row: DeviceTelemetryRow | null | undefined,
  snapshot: DevicePositionSnapshot | null | undefined,
): number | null => row?.deviceBattery ?? snapshot?.deviceBattery ?? null;

export const resolveVehicleBatteryValue = (
  row: DeviceTelemetryRow | null | undefined,
  snapshot: DevicePositionSnapshot | null | undefined,
): number | null => row?.vehicleBattery ?? snapshot?.vehicleBattery ?? null;

export const resolveEngineTemperatureValue = (
  row: DeviceTelemetryRow | null | undefined,
  snapshot: DevicePositionSnapshot | null | undefined,
  diagnosticsSnapshot?: ObdDiagnosticsSnapshot | null,
): number | null =>
  row?.engineTemperature ??
  snapshot?.engineTemperature ??
  diagnosticsSnapshot?.coolantC ??
  row?.temperature ??
  snapshot?.temperature ??
  null;
