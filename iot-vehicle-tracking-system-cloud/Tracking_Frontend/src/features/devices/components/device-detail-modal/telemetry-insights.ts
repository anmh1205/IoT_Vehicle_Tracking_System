import type { DeviceTelemetryRow } from '@/features/devices/types';

export interface RouteReplayPoint extends DeviceTelemetryRow {
  latitude: number;
  longitude: number;
  timestampMs: number;
}

export type TelemetryFreshnessState = 'healthy' | 'warning' | 'stale' | 'offline' | 'unknown';

const parseTimestamp = (value: string | null | undefined): number | null => {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
};

export const hasValidTelemetryCoordinates = (
  latitude: number | null | undefined,
  longitude: number | null | undefined,
) =>
  latitude !== null &&
  latitude !== undefined &&
  longitude !== null &&
  longitude !== undefined &&
  Number.isFinite(latitude) &&
  Number.isFinite(longitude) &&
  Math.abs(latitude) <= 90 &&
  Math.abs(longitude) <= 180 &&
  !(latitude === 0 && longitude === 0);

export const buildRouteReplayPoints = (rows: DeviceTelemetryRow[]): RouteReplayPoint[] =>
  rows
    .filter((row): row is DeviceTelemetryRow & { latitude: number; longitude: number } => {
      return hasValidTelemetryCoordinates(row.latitude, row.longitude);
    })
    .map((row) => ({
      ...row,
      latitude: row.latitude,
      longitude: row.longitude,
      timestampMs: parseTimestamp(row.timestamp) ?? 0,
    }))
    .filter((row) => row.timestampMs > 0);

export const getObservedCadenceSeconds = (
  rows: DeviceTelemetryRow[],
  sampleSize = 12,
): number | null => {
  const timestamps = rows
    .map((row) => parseTimestamp(row.timestamp))
    .filter((value): value is number => value !== null)
    .slice(-sampleSize);

  if (timestamps.length < 2) {
    return null;
  }

  const gaps = timestamps
    .slice(1)
    .map((value, index) => Math.max(0, Math.round((value - timestamps[index]) / 1000)))
    .filter((value) => value > 0);

  if (gaps.length === 0) {
    return null;
  }

  const sorted = [...gaps].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
  }

  return sorted[middle];
};

export const getFreshnessSeconds = (timestamp: string | null | undefined): number | null => {
  const parsed = parseTimestamp(timestamp);
  if (parsed === null) {
    return null;
  }

  return Math.max(0, Math.round((Date.now() - parsed) / 1000));
};

export const getTelemetryFreshnessState = (
  freshnessSeconds: number | null,
  configuredIntervalSeconds: number | null | undefined,
): TelemetryFreshnessState => {
  if (freshnessSeconds === null) {
    return 'unknown';
  }

  const baseline = Math.max(Number(configuredIntervalSeconds ?? 60), 10);

  if (freshnessSeconds <= baseline * 1.5) {
    return 'healthy';
  }

  if (freshnessSeconds <= baseline * 3) {
    return 'warning';
  }

  if (freshnessSeconds <= baseline * 6) {
    return 'stale';
  }

  return 'offline';
};

export const formatSecondsLabel = (value: number | null): string => {
  if (value === null) {
    return 'Chưa có';
  }

  if (value < 60) {
    return `${value}s`;
  }

  if (value < 3600) {
    return `${Math.round(value / 60)} phút`;
  }

  return `${Math.round(value / 3600)} giờ`;
};

export const formatCoordinateLabel = (
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  digits = 5,
) =>
  hasValidTelemetryCoordinates(latitude, longitude)
    ? `${latitude!.toFixed(digits)}, ${longitude!.toFixed(digits)}`
    : 'Chưa có vị trí';
