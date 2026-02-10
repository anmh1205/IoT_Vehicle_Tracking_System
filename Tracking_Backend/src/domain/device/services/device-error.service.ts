import { findMany } from '@/infrastructure/database/queries';

interface DeviceErrorRow {
  id: number;
  error_code: number | null;
  message: string | null;
  server_timestamp: Date;
  resolved_at: Date | null;
}

export const listErrors = async (deviceId: string, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  const rows = await findMany<DeviceErrorRow>(
    `SELECT id, error_code, message, server_timestamp, resolved_at
     FROM event_logs
     WHERE device_id = $1 AND error_code IS NOT NULL
     ORDER BY server_timestamp DESC
     LIMIT $2 OFFSET $3`,
    [deviceId, limit, offset],
  );

  return {
    items: rows.map((row) => ({
      id: row.id,
      errorCode: row.error_code ?? 0,
      errorName: `Code ${row.error_code ?? 0}`,
      description: row.message ?? '',
      occurredAt: row.server_timestamp.toISOString(),
      resolvedAt: row.resolved_at?.toISOString() ?? null,
    })),
  };
};
