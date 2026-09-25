import type { Device, DevicePositionSnapshot, DeviceTelemetryRow } from '@/features/devices/types';
import { formatNumber } from '@/lib/utils/date/format';
import { isVehicleEngineOnState, isVehicleParkedOffState } from '@/lib/utils/device-state';
import type { ObdDiagnosticsSnapshot } from './obd-diagnostics';

const PARKED_WAKE_INTERVAL_CAP_SEC = 120;
const PARKED_WAKE_INTERVAL_MIN_SEC = 60;

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

const pickRoundedPositiveInt = (value: unknown): number | null => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed);
};

const toTimestampMs = (value: string | null | undefined): number => {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
};

export interface DeviceConfigSummary {
  drivingIntervalSec: number | null;
  parkingIntervalSec: number | null;
  parkingHeartbeatSec: number | null;
  appliedParkingWakeIntervalSec: number | null;
  overspeedKph: number | null;
  imuAccelDeltaThresholdMps2: number | null;
  offlineAfterSec: number | null;
  activeIntervalSec: number | null;
  activeProfileLabel: string;
  activeProfileHint: string;
}

export interface FirmwareConfigCommandParams {
  tracking_interval_s?: number;
  heartbeat_interval_s?: number;
}

export const getAppliedParkingWakeIntervalSec = (
  heartbeatIntervalSec: number | null | undefined,
): number | null => {
  const resolved = pickNumber([heartbeatIntervalSec], null);
  if (resolved === null) {
    return null;
  }

  return Math.min(
    Math.max(resolved, PARKED_WAKE_INTERVAL_MIN_SEC),
    PARKED_WAKE_INTERVAL_CAP_SEC,
  );
};

export const buildFirmwareConfigCommandParams = (input: {
  drivingIntervalSec?: number | null;
  parkingHeartbeatSec?: number | null;
}): FirmwareConfigCommandParams => {
  const params: FirmwareConfigCommandParams = {};
  const trackingIntervalSec = pickRoundedPositiveInt(input.drivingIntervalSec);
  const heartbeatIntervalSec = pickRoundedPositiveInt(input.parkingHeartbeatSec);

  if (trackingIntervalSec !== null) {
    params.tracking_interval_s = trackingIntervalSec;
  }
  if (heartbeatIntervalSec !== null) {
    params.heartbeat_interval_s = heartbeatIntervalSec;
  }

  return params;
};

export const getDeviceConfigSummary = (
  device: Pick<
    Device,
    'config' | 'requestInterval' | 'currentStatus' | 'imuAccelDeltaThresholdMps2' | 'vehicleState'
  > | null,
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
  const appliedParkingWakeIntervalSec = getAppliedParkingWakeIntervalSec(parkingHeartbeatSec);
  const overspeedKph = pickNumber([alerts?.overspeedKph, alerts?.overspeed_kph], 80);
  const imuAccelDeltaThresholdMps2 = pickNumber(
    [
      alerts?.imuAccelDeltaThresholdMps2,
      alerts?.imu_accel_delta_threshold_mps2,
      alerts?.vibrationThreshold,
      alerts?.vibration_threshold,
      device?.imuAccelDeltaThresholdMps2,
    ],
    2,
  );
  const offlineAfterSec = pickNumber([alerts?.offlineAfterSec, alerts?.offline_after_s], 900);
  const isEngineOn = isVehicleEngineOnState(device?.vehicleState);
  const isParkedOff = isVehicleParkedOffState(device?.vehicleState);

  return {
    drivingIntervalSec,
    parkingIntervalSec,
    parkingHeartbeatSec,
    appliedParkingWakeIntervalSec,
    overspeedKph,
    imuAccelDeltaThresholdMps2,
    offlineAfterSec,
    activeIntervalSec: isEngineOn ? drivingIntervalSec : appliedParkingWakeIntervalSec,
    activeProfileLabel: isEngineOn
      ? 'Máy đang bật'
      : isParkedOff
        ? 'Đỗ xe / tắt máy'
        : 'Đứng yên / chưa rõ máy',
    activeProfileHint: isEngineOn
      ? 'Xe đang ở trạng thái máy bật nên theo dõi bằng profile driving.'
      : isParkedOff
        ? 'Xe đã tắt máy nên firmware thức theo heartbeat parked và hiện bị giới hạn tối đa 120 giây để bắt lại IGN.'
        : 'Chưa xác định chắc máy bật hay tắt, tạm đánh giá theo cadence parked wake của firmware.',
  };
};

export const formatElectricalMetric = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) {
    return '-';
  }

  if (value > 24) {
    return `${formatNumber(value)}%`;
  }

  return `${formatNumber(value)} V`;
};

export const formatTemperatureMetric = (value: number | null | undefined): string =>
  value === null || value === undefined || !Number.isFinite(value) ? '-' : `${formatNumber(value)}°C`;

export const pickLatestTelemetryValue = <TValue>(
  rowValue: TValue | null | undefined,
  rowTimestamp: string | null | undefined,
  snapshotValue: TValue | null | undefined,
  snapshotTimestamp: string | null | undefined,
  fallbackValue: TValue | null | undefined = null,
): TValue | null => {
  const normalizedFallback = fallbackValue ?? null;
  const rowHasValue = rowValue !== null && rowValue !== undefined;
  const snapshotHasValue = snapshotValue !== null && snapshotValue !== undefined;

  if (!rowHasValue && !snapshotHasValue) {
    return normalizedFallback;
  }

  if (rowHasValue && !snapshotHasValue) {
    return rowValue as TValue;
  }

  if (!rowHasValue && snapshotHasValue) {
    return snapshotValue as TValue;
  }

  return toTimestampMs(snapshotTimestamp) > toTimestampMs(rowTimestamp)
    ? (snapshotValue as TValue)
    : (rowValue as TValue);
};

export const pickLatestTelemetryTimestamp = (
  rowTimestamp: string | null | undefined,
  snapshotTimestamp: string | null | undefined,
  fallbackTimestamp: string | null | undefined = null,
): string | null =>
  pickLatestTelemetryValue(
    rowTimestamp ?? null,
    rowTimestamp,
    snapshotTimestamp ?? null,
    snapshotTimestamp,
    fallbackTimestamp ?? null,
  );

export const resolveDeviceBatteryValue = (
  row: DeviceTelemetryRow | null | undefined,
  snapshot: DevicePositionSnapshot | null | undefined,
): number | null =>
  pickLatestTelemetryValue(
    row?.deviceBattery,
    row?.timestamp,
    snapshot?.deviceBattery,
    snapshot?.timestamp,
  );

export const resolveVehicleBatteryValue = (
  row: DeviceTelemetryRow | null | undefined,
  snapshot: DevicePositionSnapshot | null | undefined,
): number | null =>
  pickLatestTelemetryValue(
    row?.vehicleBattery,
    row?.timestamp,
    snapshot?.vehicleBattery,
    snapshot?.timestamp,
  );

export const resolveEngineTemperatureValue = (
  row: DeviceTelemetryRow | null | undefined,
  snapshot: DevicePositionSnapshot | null | undefined,
  diagnosticsSnapshot?: ObdDiagnosticsSnapshot | null,
): number | null =>
  pickLatestTelemetryValue(
    row?.engineTemperature ?? row?.temperature,
    row?.timestamp,
    snapshot?.engineTemperature ?? snapshot?.temperature,
    snapshot?.timestamp,
    diagnosticsSnapshot?.coolantC ?? null,
  );
