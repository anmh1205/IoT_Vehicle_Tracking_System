import { findMany } from '@/infrastructure/database/queries';

interface TelemetryRow {
  server_timestamp: Date;
  value: string | null;
}

const ALLOWED_METRICS = ['vib', 'spd', 'bt', 'bb', 'lat', 'lon', 'err'];

export const getTelemetry = async (
  deviceId: string,
  params: { metric: string; from?: string; to?: string },
) => {
  const metric = ALLOWED_METRICS.includes(params.metric) ? params.metric : 'vib';
  const from = params.from ? new Date(params.from) : new Date(Date.now() - 24 * 60 * 60 * 1000);
  const to = params.to ? new Date(params.to) : new Date();

  const rows = await findMany<TelemetryRow>(
    `SELECT server_timestamp, COALESCE(context->>$2, metadata->>$2) AS value
     FROM event_logs
     WHERE device_id = $1
       AND server_timestamp BETWEEN $3 AND $4
       AND (context ? $2 OR metadata ? $2)
     ORDER BY server_timestamp ASC
     LIMIT 5000`,
    [deviceId, metric, from.toISOString(), to.toISOString()],
  );

  return {
    metric,
    data: rows.map((row) => ({
      timestamp: row.server_timestamp.toISOString(),
      value: row.value ? Number.parseFloat(row.value) : 0,
    })),
  };
};
