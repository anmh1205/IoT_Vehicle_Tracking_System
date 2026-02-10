import { pool } from '@/infrastructure/database/pool';
import { findMany } from '@/infrastructure/database/queries';
import type { ActivityQuery } from '@/domain/dashboard/types/dashboard.types';

interface StatusCountRow {
  current_status: string;
  count: string;
}

interface SumRow {
  total: string;
}

interface CountRow {
  count: string;
}

interface EventLogRow {
  id: number;
  correlation_id: string;
  device_id: string;
  event_type: string;
  event_code: string | null;
  severity: string;
  message: string | null;
  server_timestamp: Date;
}

export const getDeviceStatusCounts = async (): Promise<Record<string, number>> => {
  const result = await pool.query<StatusCountRow>(
    'SELECT current_status, COUNT(*)::text as count FROM devices GROUP BY current_status',
  );

  const counts: Record<string, number> = {};
  for (const row of result.rows) {
    counts[row.current_status] = parseInt(row.count, 10);
  }
  return counts;
};

export const getTotalRuntimeToday = async (): Promise<number> => {
  const result = await pool.query<SumRow>(
    `SELECT COALESCE(SUM(total_runtime_seconds), 0)::text as total
     FROM device_sessions
     WHERE server_session_start >= CURRENT_DATE`,
  );
  return parseInt(result.rows[0].total, 10);
};

export const getTotalRuntimeWeek = async (): Promise<number> => {
  const result = await pool.query<SumRow>(
    `SELECT COALESCE(SUM(total_runtime_seconds), 0)::text as total
     FROM device_sessions
     WHERE server_session_start >= CURRENT_DATE - INTERVAL '7 days'`,
  );
  return parseInt(result.rows[0].total, 10);
};

export const getActiveAlertsCount = async (): Promise<number> => {
  const result = await pool.query<CountRow>(
    `SELECT COUNT(*)::text as count FROM alerts WHERE status = 'active'`,
  );
  return parseInt(result.rows[0].count, 10);
};

export const getSessionsToday = async (): Promise<number> => {
  const result = await pool.query<CountRow>(
    `SELECT COUNT(*)::text as count
     FROM device_sessions
     WHERE server_session_start >= CURRENT_DATE`,
  );
  return parseInt(result.rows[0].count, 10);
};

export const getActivityEvents = async (
  query: ActivityQuery,
): Promise<{ events: EventLogRow[]; total: number }> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (query.deviceId) {
    conditions.push(`device_id = $${paramIndex++}`);
    params.push(query.deviceId);
  }

  if (query.eventType) {
    conditions.push(`event_type = $${paramIndex++}`);
    params.push(query.eventType);
  }

  if (query.severity) {
    conditions.push(`severity = $${paramIndex++}`);
    params.push(query.severity);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query<CountRow>(
    `SELECT COUNT(*)::text as count FROM event_logs ${whereClause}`,
    params,
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const events = await findMany<EventLogRow>(
    `SELECT id, correlation_id, device_id, event_type, event_code, severity, message, server_timestamp
     FROM event_logs ${whereClause}
     ORDER BY server_timestamp DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset],
  );

  return { events, total };
};
