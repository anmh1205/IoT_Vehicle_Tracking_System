import type { DeviceSession, DeviceTelemetryRow } from '@/features/devices/types';

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

const SESSION_WINDOW_TOLERANCE_MS = 2 * 1000;

export const filterTelemetryRowsBySession = (
  rows: DeviceTelemetryRow[],
  session: DeviceSession | null,
): DeviceTelemetryRow[] => {
  if (!session) {
    return [];
  }

  const start = parseTimestamp(session.sessionStart) ?? parseTimestamp(session.serverSessionStart);
  const end = parseTimestamp(session.sessionEnd) ?? parseTimestamp(session.serverSessionEnd);

  if (start === null) {
    return [];
  }

  return rows.filter((row) => {
    const timestamp = parseTimestamp(row.timestamp);
    if (timestamp === null || timestamp < start - SESSION_WINDOW_TOLERANCE_MS) {
      return false;
    }

    if (end !== null && timestamp > end + SESSION_WINDOW_TOLERANCE_MS) {
      return false;
    }

    return true;
  });
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

const toRadians = (value: number) => (value * Math.PI) / 180;

export const haversineKm = (from: [number, number], to: [number, number]): number => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(to[0] - from[0]);
  const dLon = toRadians(to[1] - from[1]);
  const lat1 = toRadians(from[0]);
  const lat2 = toRadians(to[0]);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const MAX_ROUTE_GAP_KM = 25;
const MAX_ROUTE_GAP_MS = 30 * 60 * 1000;

export const selectLatestContiguousRouteRows = (
  rowsAscending: DeviceTelemetryRow[],
): DeviceTelemetryRow[] => {
  const rowsWithCoordinates = rowsAscending.filter(
    (row): row is DeviceTelemetryRow & { latitude: number; longitude: number } =>
      hasValidTelemetryCoordinates(row.latitude, row.longitude),
  );

  if (rowsWithCoordinates.length <= 1) {
    return rowsWithCoordinates;
  }

  const segments: DeviceTelemetryRow[][] = [];
  let activeSegment: DeviceTelemetryRow[] = [rowsWithCoordinates[0]];

  for (let index = 1; index < rowsWithCoordinates.length; index += 1) {
    const previous = rowsWithCoordinates[index - 1];
    const current = rowsWithCoordinates[index];
    const timeGapMs = Math.max(0, Date.parse(current.timestamp) - Date.parse(previous.timestamp));
    const distanceGapKm = haversineKm(
      [previous.latitude, previous.longitude],
      [current.latitude, current.longitude],
    );

    if (timeGapMs > MAX_ROUTE_GAP_MS || distanceGapKm > MAX_ROUTE_GAP_KM) {
      segments.push(activeSegment);
      activeSegment = [current];
      continue;
    }

    activeSegment.push(current);
  }

  segments.push(activeSegment);
  return [...segments].reverse().find((segment) => segment.length > 1) ?? activeSegment;
};

export const countRouteReplayPointsForSession = (
  rowsAscending: DeviceTelemetryRow[],
  session: DeviceSession | null,
): number =>
  buildRouteReplayPoints(
    selectLatestContiguousRouteRows(filterTelemetryRowsBySession(rowsAscending, session)),
  ).length;

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
