import { findMany } from '@/infrastructure/database/queries';
import { eventLogPositionValueSql } from '@/shared/utils/event-log-telemetry-sql.util';

interface EventLogRow {
  telemetry_timestamp: Date;
  server_timestamp: Date;
  context: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  normalized_latitude: string | null;
  normalized_longitude: string | null;
  normalized_speed: string | null;
  normalized_course: string | null;
}

interface TelemetryFieldDescriptor {
  outputKey: string;
  storageKeys: string[];
}

const DEFAULT_FIELDS = ['latitude', 'longitude', 'speed'];
const FIELD_ALIASES: Record<string, TelemetryFieldDescriptor> = {
  latitude: { outputKey: 'latitude', storageKeys: ['latitude'] },
  longitude: { outputKey: 'longitude', storageKeys: ['longitude'] },
  speed: { outputKey: 'speed', storageKeys: ['speed'] },
  course: { outputKey: 'course', storageKeys: ['course'] },
  imuacceldeltamps2: {
    outputKey: 'imuAccelDeltaMps2',
    storageKeys: ['imu_accel_delta_mps2', 'vibration'],
  },
  vibration: {
    outputKey: 'imuAccelDeltaMps2',
    storageKeys: ['imu_accel_delta_mps2', 'vibration'],
  },
  temperature: { outputKey: 'temperature', storageKeys: ['temperature'] },
  vehiclebattery: { outputKey: 'vehicleBattery', storageKeys: ['vehicle_battery'] },
  devicebattery: { outputKey: 'deviceBattery', storageKeys: ['device_battery'] },
  errorcode: { outputKey: 'errorCode', storageKeys: ['error_code'] },
};

const readValueAtPath = (
  source: Record<string, unknown> | null,
  path: string[],
): number | string | null => {
  if (!source) return null;
  let value: unknown = source;

  for (const segment of path) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    value = (value as Record<string, unknown>)[segment];
  }

  if (value === undefined || value === null) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? value : parsed;
  }
  return null;
};

const buildCandidatePaths = (key: string): string[][] => {
  const topLevel = [key];

  switch (key) {
    case 'latitude':
    case 'longitude':
    case 'speed':
    case 'course':
    case 'error_code':
    case 'satellites':
    case 'device_battery':
    case 'vehicle_battery':
    case 'imu_accel_delta_mps2':
      return [
        ['raw_payload', 'data', key],
        topLevel,
      ];
    case 'temperature':
      return [
        topLevel,
        ['raw_payload', 'diagnostics', 'signals', 'coolant_c'],
        ['diagnostics', 'signals', 'coolant_c'],
        ['raw_payload', 'diagnostics', 'signals', 'intake_air_temp_c'],
        ['diagnostics', 'signals', 'intake_air_temp_c'],
      ];
    case 'vibration':
      return [
        ['raw_payload', 'data', 'imu_accel_delta_mps2'],
        ['imu_accel_delta_mps2'],
        topLevel,
      ];
    default:
      return [topLevel];
  }
};

const readValue = (source: Record<string, unknown> | null, key: string): number | string | null =>
  buildCandidatePaths(key)
    .map((path) => readValueAtPath(source, path))
    .find((value) => value !== null) ?? null;

const normalizeSelectedValue = (value: string | number | null | undefined): number | string | null => {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number') return value;
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? value : parsed;
};

const readNormalizedPositionValue = (
  row: EventLogRow,
  outputKey: string,
): number | string | null => {
  switch (outputKey) {
    case 'latitude':
      return normalizeSelectedValue(row.normalized_latitude);
    case 'longitude':
      return normalizeSelectedValue(row.normalized_longitude);
    case 'speed':
      return normalizeSelectedValue(row.normalized_speed);
    case 'course':
      return normalizeSelectedValue(row.normalized_course);
    default:
      return null;
  }
};

const NORMALIZED_POSITION_FIELDS = new Set(['latitude', 'longitude', 'speed', 'course']);

export const getTelemetryHistory = async (params: {
  deviceId: string;
  from?: string;
  to?: string;
  fields?: string;
}) => {
  const from = params.from ? new Date(params.from) : new Date(Date.now() - 24 * 60 * 60 * 1000);
  const to = params.to ? new Date(params.to) : new Date();
  const fields = (params.fields ?? DEFAULT_FIELDS.join(','))
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => FIELD_ALIASES[item.toLowerCase()])
    .filter((item): item is TelemetryFieldDescriptor => item !== undefined);

  const rows = await findMany<EventLogRow>(
    `SELECT
       COALESCE(device_timestamp, server_timestamp) AS telemetry_timestamp,
       server_timestamp,
       context,
       metadata,
       ${eventLogPositionValueSql('latitude')} AS normalized_latitude,
       ${eventLogPositionValueSql('longitude')} AS normalized_longitude,
       ${eventLogPositionValueSql('speed')} AS normalized_speed,
       ${eventLogPositionValueSql('course')} AS normalized_course
     FROM event_logs
     WHERE device_id = $1
       AND COALESCE(device_timestamp, server_timestamp) BETWEEN $2 AND $3
     ORDER BY telemetry_timestamp ASC, server_timestamp ASC, id ASC
     LIMIT 10000`,
    [params.deviceId, from.toISOString(), to.toISOString()],
  );

  const points = rows.map((row) => {
    const point: Record<string, unknown> = {
      ts: Math.floor(row.telemetry_timestamp.getTime() / 1000),
      timestamp: row.telemetry_timestamp.toISOString(),
    };
    for (const field of fields) {
      if (NORMALIZED_POSITION_FIELDS.has(field.outputKey)) {
        point[field.outputKey] = readNormalizedPositionValue(row, field.outputKey);
        continue;
      }

      const fromContext = field.storageKeys
        .map((key) => readValue(row.context, key))
        .find((value) => value !== null);
      const fromMetadata = field.storageKeys
        .map((key) => readValue(row.metadata, key))
        .find((value) => value !== null);
      point[field.outputKey] = fromContext ?? fromMetadata ?? null;
    }
    return point;
  });

  return { deviceId: params.deviceId, points };
};
