import { findMany } from '@/infrastructure/database/queries';

interface EventLogRow {
  server_timestamp: Date;
  context: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
}

const normalizeField = (field: string): string => {
  if (field === 'speed') return 'spd';
  return field;
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
  const fields = (params.fields ?? 'lat,lon,spd')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map(normalizeField);

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
      const fromContext = readValue(row.context, field);
      const fromMetadata = readValue(row.metadata, field);
      point[field] = fromContext ?? fromMetadata ?? null;
    }
    return point;
  });

  return { deviceId: params.deviceId, points };
};
