import { findMany } from '@/infrastructure/database/queries';

interface DeviceErrorAlertRow {
  id: number;
  title: string | null;
  message: string | null;
  severity: string | null;
  status: string | null;
  created_at: Date;
  resolved_at: Date | null;
}

const DTC_PATTERN = /\b[PCBU][0-3][0-9A-F]{3}\b/i;
const ECU_ALERT_FILTER_SQL = `device_id = $1
  AND (
    source::text IN ('ecu', 'obd')
    OR CONCAT_WS(' ', COALESCE(title, ''), COALESCE(message, '')) ~*
      '(^|[^a-z0-9])(obd|dtc|mil|ecu|[pcbu][0-3][0-9a-f]{3})([^a-z0-9]|$)'
  )`;

const extractDtcCode = (title: string | null, message: string | null): string | null => {
  const matched = `${title ?? ''} ${message ?? ''}`.match(DTC_PATTERN)?.[0];
  return matched ? matched.toUpperCase() : null;
};

const severityToErrorCode = (severity: string | null): number => {
  switch (String(severity ?? '').toLowerCase()) {
    case 'critical':
      return 500;
    case 'high':
      return 400;
    case 'medium':
      return 300;
    case 'low':
      return 200;
    default:
      return 100;
  }
};

export const listErrors = async (deviceId: string, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  const [rows, totalRows] = await Promise.all([
    findMany<DeviceErrorAlertRow>(
      `SELECT id, title, message, severity, status, created_at, resolved_at
       FROM alerts
       WHERE ${ECU_ALERT_FILTER_SQL}
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [deviceId, limit, offset],
    ),
    findMany<{ total: number }>(
      `SELECT COUNT(*)::int AS total
       FROM alerts
       WHERE ${ECU_ALERT_FILTER_SQL}`,
      [deviceId],
    ),
  ]);
  const total = totalRows[0]?.total ?? 0;

  return {
    items: rows.map((row) => {
      const dtcCode = extractDtcCode(row.title, row.message);
      return {
        id: row.id,
        errorCode: severityToErrorCode(row.severity),
        errorName: dtcCode ?? row.title ?? `Alert ${row.id}`,
        description: row.message ?? row.title ?? '',
        severity: row.severity ?? 'medium',
        status: row.status ?? 'active',
        occurredAt: row.created_at.toISOString(),
        resolvedAt: row.resolved_at?.toISOString() ?? null,
      };
    }),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / Math.max(limit, 1)), 1),
    },
  };
};
