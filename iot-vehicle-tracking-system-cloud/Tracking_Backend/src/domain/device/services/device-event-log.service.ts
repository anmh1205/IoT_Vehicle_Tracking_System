import { findMany } from '@/infrastructure/database/queries';

interface DeviceEventLogRow {
  id: number;
  correlation_id: string | null;
  device_id: string;
  session_id: number | null;
  event_type: string;
  event_code: string | null;
  severity: string | null;
  context: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  message: string | null;
  device_timestamp: Date | null;
  server_timestamp: Date;
  created_at: Date;
  event_timestamp: Date;
  [key: string]: unknown;
}

const EVENT_TIMESTAMP_SQL = 'COALESCE(device_timestamp, server_timestamp)';

const toIsoTimestamp = (value: Date | string | null | undefined): string | null => {
  if (value == null) {
    return null;
  }
  return value instanceof Date ? value.toISOString() : String(value);
};

export const listEventLogs = async (deviceId: string, page = 1, limit = 20) => {
  const safePage = Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1);
  const safeLimit = Math.max(1, Math.min(Number.isFinite(limit) ? Math.floor(limit) : 20, 100));
  const offset = (safePage - 1) * safeLimit;

  const [rows, totalRows] = await Promise.all([
    findMany<DeviceEventLogRow>(
      `SELECT
         *,
         ${EVENT_TIMESTAMP_SQL} AS event_timestamp
       FROM event_logs
       WHERE device_id = $1
       ORDER BY event_timestamp DESC, server_timestamp DESC, id DESC
       LIMIT $2 OFFSET $3`,
      [deviceId, safeLimit, offset],
    ),
    findMany<{ total: number }>(
      `SELECT COUNT(*)::int AS total
       FROM event_logs
       WHERE device_id = $1`,
      [deviceId],
    ),
  ]);

  const total = totalRows[0]?.total ?? 0;
  return {
    items: rows.map((row) => ({
      ...row,
      event_timestamp: toIsoTimestamp(row.event_timestamp),
      device_timestamp: toIsoTimestamp(row.device_timestamp),
      server_timestamp: toIsoTimestamp(row.server_timestamp),
      created_at: toIsoTimestamp(row.created_at),
    })),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(Math.ceil(total / safeLimit), 1),
    },
  };
};
