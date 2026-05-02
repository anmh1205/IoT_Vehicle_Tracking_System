import { findMany } from '@/infrastructure/database/queries';

interface EventLogRow {
  server_timestamp: Date;
  context: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
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

const readValue = (source: Record<string, unknown> | null, key: string): number | string | null => {
  if (!source) return null;
  const value = source[key];
  if (value === undefined || value === null) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? value : parsed;
  }
  return null;
};

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
    `SELECT server_timestamp, context, metadata
     FROM event_logs
     WHERE device_id = $1
       AND server_timestamp BETWEEN $2 AND $3
     ORDER BY server_timestamp ASC
     LIMIT 10000`,
    [params.deviceId, from.toISOString(), to.toISOString()],
  );

  const points = rows.map((row) => {
    const point: Record<string, unknown> = {
      ts: Math.floor(row.server_timestamp.getTime() / 1000),
      timestamp: row.server_timestamp.toISOString(),
    };
    for (const field of fields) {
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
