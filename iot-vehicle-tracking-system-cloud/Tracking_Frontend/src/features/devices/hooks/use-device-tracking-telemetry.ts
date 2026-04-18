import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { deviceDetailServices } from '@/lib/api/device-detail';
import type {
  DeviceTelemetryPoint,
  DeviceTelemetryRow,
  DeviceTrackingMetric,
} from '@/features/devices/types';

export type TrackingTelemetryPeriod = '6h' | '24h' | '7d';

const TRACKING_METRICS: DeviceTrackingMetric[] = [
  'lat',
  'lon',
  'spd',
  'bb',
  'bt',
  'temp',
  'err',
  'vib',
];

const toPeriodStart = (period: TrackingTelemetryPeriod): string => {
  const now = Date.now();
  const offsetMs =
    period === '6h'
      ? 6 * 60 * 60 * 1000
      : period === '24h'
        ? 24 * 60 * 60 * 1000
        : 7 * 24 * 60 * 60 * 1000;
  return new Date(now - offsetMs).toISOString();
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

const toRadians = (value: number) => (value * Math.PI) / 180;

const haversineKm = (from: [number, number], to: [number, number]): number => {
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

const emptyRowAt = (timestamp: string): DeviceTelemetryRow => ({
  timestamp,
  latitude: null,
  longitude: null,
  speed: null,
  battery: null,
  deviceBattery: null,
  vehicleBattery: null,
  temperature: null,
  engineTemperature: null,
  errorCode: null,
  vibration: null,
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

  for (const point of metricSeries.lat) {
    ensureRow(point.timestamp).latitude = point.value;
  }
  for (const point of metricSeries.lon) {
    ensureRow(point.timestamp).longitude = point.value;
  }
  for (const point of metricSeries.spd) {
    ensureRow(point.timestamp).speed = point.value;
  }
  for (const point of metricSeries.bb) {
    ensureRow(point.timestamp).deviceBattery = point.value;
    ensureRow(point.timestamp).battery = point.value;
  }
  for (const point of metricSeries.bt) {
    ensureRow(point.timestamp).vehicleBattery = point.value;
  }
  for (const point of metricSeries.temp) {
    ensureRow(point.timestamp).engineTemperature = point.value;
    ensureRow(point.timestamp).temperature = point.value;
  }
  for (const point of metricSeries.err) {
    ensureRow(point.timestamp).errorCode = point.value;
  }
  for (const point of metricSeries.vib) {
    ensureRow(point.timestamp).vibration = point.value;
  }

  return Array.from(bucket.values()).sort(
    (left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp),
  );
};

export const useDeviceTrackingTelemetry = (deviceId: number | null) => {
  const [period, setPeriod] = useState<TrackingTelemetryPeriod>('24h');
  const from = toPeriodStart(period);
  const to = new Date().toISOString();

  const query = useQuery({
    queryKey: ['device-tracking-telemetry', deviceId, period],
    queryFn: async () => {
      const responses = await Promise.all(
        TRACKING_METRICS.map((metric) =>
          deviceDetailServices.getTelemetry(deviceId as number, { metric, from, to }),
        ),
      );

      return TRACKING_METRICS.reduce(
        (accumulator, metric, index) => {
          accumulator[metric] = toTelemetryPoints(responses[index]);
          return accumulator;
        },
        {
          lat: [],
          lon: [],
          spd: [],
          bb: [],
          bt: [],
          temp: [],
          err: [],
          vib: [],
        } as Record<DeviceTrackingMetric, DeviceTelemetryPoint[]>,
      );
    },
    enabled: !!deviceId,
  });

  const rowsAscending = useMemo(() => buildTelemetryRows(query.data ?? {
    lat: [],
    lon: [],
    spd: [],
    bb: [],
    bt: [],
    temp: [],
    err: [],
    vib: [],
  }), [query.data]);

  const routePoints = useMemo(() => {
    return rowsAscending
      .filter((row) => hasValidCoordinates(row.latitude, row.longitude))
      .map((row) => [row.latitude as number, row.longitude as number] as [number, number]);
  }, [rowsAscending]);

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
    const values = rowsAscending
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
  }, [rowsAscending]);

  const latestRow = rowsAscending.at(-1) ?? null;
  const rows = useMemo(() => [...rowsAscending].reverse(), [rowsAscending]);

  return {
    ...query,
    dataByMetric:
      query.data ??
      ({
        lat: [],
        lon: [],
        spd: [],
        bb: [],
        bt: [],
        temp: [],
        err: [],
        vib: [],
      } as Record<DeviceTrackingMetric, DeviceTelemetryPoint[]>),
    rows,
    rowsAscending,
    routePoints,
    latestRow,
    distanceKm,
    averageSpeed,
    maxSpeed,
    period,
    onPeriodChange: setPeriod,
  };
};
