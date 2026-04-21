import { findMany } from '@/infrastructure/database/queries';

interface DeviceErrorRow {
  id: number;
  error_code: number | null;
  message: string | null;
  metadata: Record<string, unknown> | null;
  server_timestamp: Date;
  resolved_at: Date | null;
}

const extractDtcLabel = (row: DeviceErrorRow): string | null => {
  const dtc = row.metadata?.dtc;
  if (typeof dtc === 'string' && dtc.trim().length > 0) {
    return dtc.trim().toUpperCase();
  }

  const matchedCode = row.message?.match(/\b[PCBU][0-9A-F]{4}\b/i)?.[0];
  return matchedCode ? matchedCode.toUpperCase() : null;
};

export const listErrors = async (deviceId: string, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  const rows = await findMany<DeviceErrorRow>(
    `SELECT id, error_code, message, metadata, server_timestamp, resolved_at
     FROM event_logs
     WHERE device_id = $1
       AND (error_code IS NOT NULL OR metadata ? 'dtc')
     ORDER BY server_timestamp DESC
     LIMIT $2 OFFSET $3`,
    [deviceId, limit, offset],
  );

  return {
    items: rows.map((row) => ({
      id: row.id,
      errorCode: row.error_code ?? 0,
      errorName: extractDtcLabel(row) ?? `Code ${row.error_code ?? 0}`,
      description: row.message ?? '',
      occurredAt: row.server_timestamp.toISOString(),
      resolvedAt: row.resolved_at?.toISOString() ?? null,
    })),
  };
};
