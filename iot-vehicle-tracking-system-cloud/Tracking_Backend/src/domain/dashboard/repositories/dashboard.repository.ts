import { pool } from '@/infrastructure/database/pool';
import { findMany } from '@/infrastructure/database/queries';
import type { ActivityQuery } from '@/domain/dashboard/types/dashboard.types';
import { isUndefinedColumnError } from '@/shared/utils/postgres-error.util';

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

interface DeviceActivityRow {
  label: string;
  running: string;
  idle: string;
  offline: string;
}

interface DeviceStatusRow {
  status_name: string;
  count: string;
  color: string;
}

interface FleetRuntimeRow {
  label: string;
  runtime_hours: string;
}

export const getDeviceStatusCounts = async (): Promise<Record<string, number>> => {
  const result = await pool.query<StatusCountRow>(
    'SELECT COALESCE(current_status::text, \'unknown\') AS current_status, COUNT(*)::text as count FROM devices GROUP BY COALESCE(current_status::text, \'unknown\')',
  );

  const counts: Record<string, number> = {};
  for (const row of result.rows) {
    counts[row.current_status] = parseInt(row.count, 10);
  }
  return counts;
};

const getDeviceSessionRuntimeExpression = async (): Promise<string> => {
  const result = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'device_sessions'
         AND column_name = 'total_runtime_seconds'
     )`,
  );

  return result.rows[0]?.exists
    ? 'COALESCE(total_runtime_seconds, uptime, 0)'
    : 'COALESCE(uptime, EXTRACT(EPOCH FROM (COALESCE(server_session_end, NOW()) - COALESCE(server_session_start, created_at))), 0)';
};

export const getTotalRuntimeToday = async (): Promise<number> => {
  const runtimeExpression = await getDeviceSessionRuntimeExpression();
  const result = await pool.query<SumRow>(
    `SELECT COALESCE(SUM(${runtimeExpression}), 0)::text as total
     FROM device_sessions
     WHERE COALESCE(server_session_start, created_at) >= CURRENT_DATE`,
  );
  return parseInt(result.rows[0].total, 10);
};

export const getTotalRuntimeWeek = async (): Promise<number> => {
  const runtimeExpression = await getDeviceSessionRuntimeExpression();
  const result = await pool.query<SumRow>(
    `SELECT COALESCE(SUM(${runtimeExpression}), 0)::text as total
     FROM device_sessions
     WHERE COALESCE(server_session_start, created_at) >= CURRENT_DATE - INTERVAL '7 days'`,
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

export const getDeviceActivitySeries = async (days: number): Promise<DeviceActivityRow[]> => {
  const safeDays = Math.max(1, Math.min(days, 90));
  const fromDate = new Date(Date.now() - (safeDays - 1) * 24 * 60 * 60 * 1000);

  const query = `
    WITH series AS (
      SELECT generate_series(
        DATE_TRUNC('day', $1::timestamptz),
        DATE_TRUNC('day', NOW()),
        '1 day'::interval
      ) AS bucket
    ),
    bucketed AS (
      SELECT
        DATE_TRUNC('day', server_timestamp) AS bucket,
        COUNT(*) FILTER (
          WHERE
            LOWER(COALESCE(message, '')) LIKE '%offline%'
            OR LOWER(COALESCE(message, '')) LIKE '%disconnect%'
            OR LOWER(COALESCE(event_code, '')) = 'device_offline'
        )::text AS offline,
        COUNT(*) FILTER (
          WHERE
            LOWER(COALESCE(message, '')) LIKE '%idle%'
            OR LOWER(COALESCE(message, '')) LIKE '%stop%'
            OR LOWER(COALESCE(event_type::text, '')) IN ('session_end', 'stopped')
        )::text AS idle,
        COUNT(*) FILTER (
          WHERE
            NOT (
              LOWER(COALESCE(message, '')) LIKE '%offline%'
              OR LOWER(COALESCE(message, '')) LIKE '%disconnect%'
              OR LOWER(COALESCE(event_code, '')) = 'device_offline'
              OR LOWER(COALESCE(message, '')) LIKE '%idle%'
              OR LOWER(COALESCE(message, '')) LIKE '%stop%'
              OR LOWER(COALESCE(event_type::text, '')) IN ('session_end', 'stopped')
            )
        )::text AS running
      FROM event_logs
      WHERE server_timestamp >= DATE_TRUNC('day', $1::timestamptz)
      GROUP BY bucket
    )
    SELECT
      TO_CHAR(series.bucket, 'YYYY-MM-DD') AS label,
      COALESCE(bucketed.running, '0') AS running,
      COALESCE(bucketed.idle, '0') AS idle,
      COALESCE(bucketed.offline, '0') AS offline
    FROM series
    LEFT JOIN bucketed ON bucketed.bucket = series.bucket
    ORDER BY series.bucket ASC
  `;

  const result = await pool.query<DeviceActivityRow>(query, [fromDate.toISOString()]);
  return result.rows;
};

export const getDeviceStatusDistribution = async (): Promise<DeviceStatusRow[]> => {
  const query = `
    WITH grouped AS (
      SELECT LOWER(COALESCE(current_status::text, 'unknown')) AS status, COUNT(*)::text AS count
      FROM devices
      GROUP BY LOWER(COALESCE(current_status::text, 'unknown'))
    )
    SELECT
      CASE
        WHEN status = 'running' THEN 'Running'
        WHEN status = 'online' THEN 'Online'
        WHEN status = 'stopped' THEN 'Stopped'
        WHEN status = 'disconnected' THEN 'Offline'
        WHEN status = 'error' THEN 'Error'
        ELSE 'Unknown'
      END AS status_name,
      count,
      CASE
        WHEN status = 'running' THEN '#22c55e'
        WHEN status = 'online' THEN '#3b82f6'
        WHEN status = 'stopped' THEN '#64748b'
        WHEN status = 'disconnected' THEN '#ef4444'
        WHEN status = 'error' THEN '#f59e0b'
        ELSE '#94a3b8'
      END AS color
    FROM grouped
    ORDER BY status_name ASC
  `;

  const result = await pool.query<DeviceStatusRow>(query);
  return result.rows;
};

export const getFleetRuntimeSeries = async (days: number): Promise<FleetRuntimeRow[]> => {
  const safeDays = Math.max(1, Math.min(days, 180));
  const fromDate = new Date(Date.now() - (safeDays - 1) * 24 * 60 * 60 * 1000);
  const runtimeExpression = await getDeviceSessionRuntimeExpression();

  const query = `
    WITH series AS (
      SELECT generate_series(
        DATE_TRUNC('day', $1::timestamptz),
        DATE_TRUNC('day', NOW()),
        '1 day'::interval
      ) AS bucket
    ),
    bucketed AS (
      SELECT
        DATE_TRUNC('day', COALESCE(server_session_start, created_at)) AS bucket,
        COALESCE(SUM(${runtimeExpression}), 0)::text AS runtime_seconds
      FROM device_sessions
      WHERE COALESCE(server_session_start, created_at) >= DATE_TRUNC('day', $1::timestamptz)
      GROUP BY bucket
    )
    SELECT
      TO_CHAR(series.bucket, 'YYYY-MM-DD') AS label,
      ROUND((COALESCE(bucketed.runtime_seconds, '0')::numeric / 3600.0), 2)::text AS runtime_hours
    FROM series
    LEFT JOIN bucketed ON bucketed.bucket = series.bucket
    ORDER BY series.bucket ASC
  `;

  try {
    const result = await pool.query<FleetRuntimeRow>(query, [fromDate.toISOString()]);
    return result.rows;
  } catch (error) {
    if (isUndefinedColumnError(error)) {
      return [];
    }
    throw error;
  }
};
