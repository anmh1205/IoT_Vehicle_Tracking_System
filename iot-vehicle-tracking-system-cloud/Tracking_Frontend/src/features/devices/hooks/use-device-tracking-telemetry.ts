import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { deviceDetailServices } from '@/lib/api/device-detail';
import type {
  DeviceTelemetryPoint,
  DeviceTelemetryRow,
  DeviceTrackingMetric,
} from '@/features/devices/types';
import {
  haversineKm,
  selectLatestContiguousRouteRows,
} from '@/features/devices/components/device-detail-modal/telemetry-insights';

export type TrackingTelemetryPeriod = '6h' | '24h' | '7d' | '30d' | '90d' | 'custom';

export interface TrackingTelemetryCustomRange {
  from: string;
  to: string;
}

const TRACKING_METRICS: DeviceTrackingMetric[] = [
  'latitude',
  'longitude',
  'speed',
  'deviceBattery',
  'vehicleBattery',
  'temperature',
  'errorCode',
  'imuAccelDeltaMps2',
];

const createEmptyMetricSeries = (): Record<DeviceTrackingMetric, DeviceTelemetryPoint[]> => ({
  latitude: [],
  longitude: [],
  speed: [],
  deviceBattery: [],
  vehicleBattery: [],
  temperature: [],
  errorCode: [],
  imuAccelDeltaMps2: [],
});

const toDateInput = (value: Date) => value.toISOString().slice(0, 10);

const createDefaultCustomRange = (): TrackingTelemetryCustomRange => {
  const today = new Date();
  const from = new Date(today);
  from.setDate(today.getDate() - 6);

  return {
    from: toDateInput(from),
    to: toDateInput(today),
  };
};

const toBoundaryIso = (value: string, boundary: 'start' | 'end') => {
  const time = boundary === 'start' ? '00:00:00.000' : '23:59:59.999';
  return new Date(`${value}T${time}`).toISOString();
};

const normalizeCustomRange = (
  range: TrackingTelemetryCustomRange,
): TrackingTelemetryCustomRange => {
  if (!range.from || !range.to) {
    return createDefaultCustomRange();
  }

  return range.from <= range.to
    ? range
    : {
        from: range.to,
        to: range.from,
      };
};

export const resolveTrackingTelemetryRange = (
  period: TrackingTelemetryPeriod,
  customRange: TrackingTelemetryCustomRange,
  nowMs = Date.now(),
): { from: string; to: string } => {
  if (period === 'custom') {
    const normalized = normalizeCustomRange(customRange);
    return {
      from: toBoundaryIso(normalized.from, 'start'),
      to: toBoundaryIso(normalized.to, 'end'),
    };
  }

  const offsetMs =
    period === '6h'
      ? 6 * 60 * 60 * 1000
      : period === '24h'
        ? 24 * 60 * 60 * 1000
        : period === '7d'
          ? 7 * 24 * 60 * 60 * 1000
          : period === '30d'
            ? 30 * 24 * 60 * 60 * 1000
            : 90 * 24 * 60 * 60 * 1000;

  return {
    from: new Date(nowMs - offsetMs).toISOString(),
    to: new Date(nowMs).toISOString(),
  };
};

const hasValidCoordinates = (latitude: number | null, longitude: number | null) =>
  latitude !== null &&
  longitude !== null &&
  Number.isFinite(latitude) &&
  Number.isFinite(longitude) &&
  Math.abs(latitude) <= 90 &&
  Math.abs(longitude) <= 180 &&
  !(latitude === 0 && longitude === 0);

const toTelemetryPoints = (payload: any): DeviceTelemetryPoint[] => {
  const items = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.data?.items)
        ? payload.data.items
        : [];

  return items
    .map((row: any): DeviceTelemetryPoint => ({
      timestamp: String(row?.timestamp ?? ''),
      value: Number(row?.value ?? 0),
    }))
    .filter((row: DeviceTelemetryPoint) => row.timestamp.length > 0 && Number.isFinite(row.value))
    .sort(
      (left: DeviceTelemetryPoint, right: DeviceTelemetryPoint) =>
        Date.parse(left.timestamp) - Date.parse(right.timestamp),
    );
};

const emptyRowAt = (timestamp: string): DeviceTelemetryRow => ({
  timestamp,
  latitude: null,
  longitude: null,
  speed: null,
  deviceBattery: null,
  vehicleBattery: null,
  temperature: null,
  engineTemperature: null,
  errorCode: null,
  imuAccelDeltaMps2: null,
});

const buildTelemetryRows = (
  metricSeries: Record<DeviceTrackingMetric, DeviceTelemetryPoint[]>,
): DeviceTelemetryRow[] => {
  const bucket = new Map<string, DeviceTelemetryRow>();

  const ensureRow = (timestamp: string): DeviceTelemetryRow => {
    const existing = bucket.get(timestamp);
    if (existing) {
      return existing;
    }
    const created = emptyRowAt(timestamp);
    bucket.set(timestamp, created);
    return created;
  };

  for (const point of metricSeries.latitude) {
    ensureRow(point.timestamp).latitude = point.value;
  }
  for (const point of metricSeries.longitude) {
    ensureRow(point.timestamp).longitude = point.value;
  }
  for (const point of metricSeries.speed) {
    ensureRow(point.timestamp).speed = point.value;
  }
  for (const point of metricSeries.deviceBattery) {
    ensureRow(point.timestamp).deviceBattery = point.value;
  }
  for (const point of metricSeries.vehicleBattery) {
    ensureRow(point.timestamp).vehicleBattery = point.value;
  }
  for (const point of metricSeries.temperature) {
    ensureRow(point.timestamp).engineTemperature = point.value;
    ensureRow(point.timestamp).temperature = point.value;
  }
  for (const point of metricSeries.errorCode) {
    ensureRow(point.timestamp).errorCode = point.value;
  }
  for (const point of metricSeries.imuAccelDeltaMps2) {
    ensureRow(point.timestamp).imuAccelDeltaMps2 = point.value;
  }

  return Array.from(bucket.values()).sort(
    (left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp),
  );
};

export const useDeviceTrackingTelemetry = (deviceId: number | null) => {
  const [period, setPeriod] = useState<TrackingTelemetryPeriod>('24h');
  const [customRange, setCustomRange] = useState<TrackingTelemetryCustomRange>(
    createDefaultCustomRange,
  );
  const customRangeKey = useMemo(() => normalizeCustomRange(customRange), [customRange]);

  const query = useQuery({
    queryKey: [
      'device-tracking-telemetry',
      deviceId,
      period,
      period === 'custom' ? customRangeKey.from : null,
      period === 'custom' ? customRangeKey.to : null,
    ],
    queryFn: async () => {
      const range = resolveTrackingTelemetryRange(period, customRange);
      const responses = await Promise.all(
        TRACKING_METRICS.map((metric) =>
          deviceDetailServices.getTelemetry(deviceId as number, {
            metric,
            from: range.from,
            to: range.to,
          }),
        ),
      );

      return TRACKING_METRICS.reduce(
        (accumulator, metric, index) => {
          accumulator[metric] = toTelemetryPoints(responses[index]);
          return accumulator;
        },
        createEmptyMetricSeries(),
      );
    },
    enabled: !!deviceId,
  });

  const rowsAscending = useMemo(
    () => buildTelemetryRows(query.data ?? createEmptyMetricSeries()),
    [query.data],
  );

  const routeRowsAscending = useMemo(
    () => selectLatestContiguousRouteRows(rowsAscending),
    [rowsAscending],
  );

  const routePoints = useMemo(() => {
    return routeRowsAscending
      .filter((row) => hasValidCoordinates(row.latitude, row.longitude))
      .map((row) => [row.latitude as number, row.longitude as number] as [number, number]);
  }, [routeRowsAscending]);

  const distanceKm = useMemo(() => {
    if (routePoints.length < 2) {
      return 0;
    }

    let total = 0;
    for (let index = 1; index < routePoints.length; index += 1) {
      total += haversineKm(routePoints[index - 1], routePoints[index]);
    }
    return total;
  }, [routePoints]);

  const { averageSpeed, maxSpeed } = useMemo(() => {
    const values = routeRowsAscending
      .map((row) => row.speed)
      .filter((value): value is number => value !== null && Number.isFinite(value) && value >= 0);
    if (values.length === 0) {
      return { averageSpeed: 0, maxSpeed: 0 };
    }
    const sum = values.reduce((accumulator, value) => accumulator + value, 0);
    const max = values.reduce((accumulator, value) => Math.max(accumulator, value), 0);
    return {
      averageSpeed: sum / values.length,
      maxSpeed: max,
    };
  }, [routeRowsAscending]);

  const latestRow = rowsAscending.at(-1) ?? null;
  const rows = useMemo(() => [...rowsAscending].reverse(), [rowsAscending]);

  return {
    ...query,
    dataByMetric: query.data ?? createEmptyMetricSeries(),
    rows,
    rowsAscending,
    routeRowsAscending,
    routePoints,
    latestRow,
    distanceKm,
    averageSpeed,
    maxSpeed,
    period,
    onPeriodChange: setPeriod,
    customRange,
    onCustomRangeChange: setCustomRange,
  };
};
