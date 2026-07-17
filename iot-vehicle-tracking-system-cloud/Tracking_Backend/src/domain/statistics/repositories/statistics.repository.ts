import { pool } from '@/infrastructure/database/pool';
import type {
  StatisticsDateRange,
  StatisticsInterval,
  FleetUsagePoint,
  DeviceUptimeItem,
  AlertFrequencyPoint,
  TripSummaryPoint,
} from '@/domain/statistics/types/statistics.types';

const toBucketExpression = (interval: StatisticsInterval): string => {
  if (interval === 'month') return "DATE_TRUNC('month', ts)";
  if (interval === 'week') return "DATE_TRUNC('week', ts)";
  return "DATE_TRUNC('day', ts)";
};

const toSeriesStep = (interval: StatisticsInterval): string => {
  if (interval === 'month') return '1 month';
  if (interval === 'week') return '1 week';
  return '1 day';
};

interface FleetUsageRow {
  label: Date;
  active_vehicles: string;
}

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

export const getFleetUsage = async (
  range: StatisticsDateRange,
  interval: StatisticsInterval,
): Promise<FleetUsagePoint[]> => {
  const step = toSeriesStep(interval);
  const bucketExpr = toBucketExpression(interval);
  const bucketFromSeries = bucketExpr.replace(/ts/g, 'series.ts');

  const totalResult = await pool.query<{ total: string }>(
    'SELECT COUNT(*)::text as total FROM vehicles',
  );
  const totalVehicles = parseInt(totalResult.rows[0]?.total ?? '0', 10);

  const query = `
    WITH series AS (
      SELECT generate_series($1::timestamptz, $2::timestamptz, $3::interval) AS ts
    )
    SELECT
      ${bucketFromSeries} AS label,
      COUNT(DISTINCT CASE WHEN sessions.id IS NOT NULL THEN vehicles.id END)::text AS active_vehicles
    FROM series
    LEFT JOIN vehicles
      ON vehicles.device_id IS NOT NULL
    LEFT JOIN device_sessions sessions
      ON sessions.device_id = vehicles.device_id
     AND COALESCE(sessions.server_session_start, sessions.created_at) < (${bucketFromSeries} + $3::interval)
     AND COALESCE(sessions.server_session_end, NOW()) >= ${bucketFromSeries}
     AND COALESCE(sessions.status::text, '') <> 'failed'
    GROUP BY label
    ORDER BY label ASC
  `;

  const result = await pool.query<FleetUsageRow>(query, [range.from, range.to, step]);

  return result.rows.map((row) => {
    const activeVehicles = parseInt(row.active_vehicles, 10);
    return {
      label: row.label.toISOString(),
      activeVehicles,
      inactiveVehicles: Math.max(totalVehicles - activeVehicles, 0),
    };
  });
};

interface DeviceUptimeRow {
  device_id: string;
  up_seconds: string;
}

export const getDeviceUptime = async (range: StatisticsDateRange): Promise<DeviceUptimeItem[]> => {
  const totalSeconds = Math.max((range.to.getTime() - range.from.getTime()) / 1000, 1);
  const totalHours = totalSeconds / 3600;

  const query = `
    SELECT
      d.device_id,
      COALESCE(SUM(
        CASE
          WHEN s.uptime IS NOT NULL THEN s.uptime
          ELSE EXTRACT(
            EPOCH FROM (
              COALESCE(s.server_session_end, NOW()) - COALESCE(s.server_session_start, s.created_at)
            )
          )
        END
      ), 0)::text AS up_seconds
    FROM devices d
    LEFT JOIN device_sessions s
      ON s.device_id = d.device_id
      AND COALESCE(s.server_session_start, s.created_at) <= $2
      AND COALESCE(s.server_session_end, NOW()) >= $1
    GROUP BY d.device_id
    ORDER BY d.device_id ASC
  `;

  const result = await pool.query<DeviceUptimeRow>(query, [range.from, range.to]);
  return result.rows.map((row) => {
    const upSeconds = Math.max(parseFloat(row.up_seconds), 0);
    const upHours = upSeconds / 3600;
    const downHours = Math.max(totalHours - upHours, 0);
    return {
      deviceId: row.device_id,
      uptimePercent: Math.min(Math.round((upSeconds / totalSeconds) * 10000) / 100, 100),
      totalHours: Math.round(totalHours * 100) / 100,
      downHours: Math.round(downHours * 100) / 100,
    };
  });
};

interface AlertFrequencyRow {
  label: Date;
  speeding: string;
  zone: string;
  offline: string;
  other: string;
}

export const getAlertFrequency = async (
  range: StatisticsDateRange,
  interval: StatisticsInterval,
): Promise<AlertFrequencyPoint[]> => {
  const step = toSeriesStep(interval);
  const bucketExpr = toBucketExpression(interval);

  const query = `
    WITH series AS (
      SELECT generate_series($1::timestamptz, $2::timestamptz, $3::interval) AS ts
    ),
    bucketed AS (
      SELECT
        ${bucketExpr.replace('ts', 'created_at')} AS bucket,
        COUNT(*) FILTER (WHERE alert_type = 'speeding')::text AS speeding,
        COUNT(*) FILTER (WHERE alert_type IN ('zone_enter', 'zone_exit', 'zone_outside_periodic', 'geofence_enter', 'geofence_exit'))::text AS zone,
        COUNT(*) FILTER (WHERE alert_type = 'device_offline')::text AS offline,
        COUNT(*) FILTER (WHERE alert_type NOT IN ('speeding', 'zone_enter', 'zone_exit', 'zone_outside_periodic', 'geofence_enter', 'geofence_exit', 'device_offline'))::text AS other
      FROM alerts
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY bucket
    )
    SELECT
      ${bucketExpr} AS label,
      COALESCE(bucketed.speeding, '0') AS speeding,
      COALESCE(bucketed.zone, '0') AS zone,
      COALESCE(bucketed.offline, '0') AS offline,
      COALESCE(bucketed.other, '0') AS other
    FROM series
    LEFT JOIN bucketed ON bucketed.bucket = ${bucketExpr}
    ORDER BY label ASC
  `;

  const result = await pool.query<AlertFrequencyRow>(query, [range.from, range.to, step]);
  return result.rows.map((row) => ({
    label: row.label.toISOString(),
    speeding: parseInt(row.speeding, 10),
    zone: parseInt(row.zone, 10),
    offline: parseInt(row.offline, 10),
    other: parseInt(row.other, 10),
  }));
};

interface TripSummaryRow {
  label: Date;
  total_trips: string;
  total_distance_km: string;
  avg_duration_minutes: string;
}

interface SummaryTotalsRow {
  total_runtime_hours: string;
  total_sessions: string;
  total_alerts: string;
}

interface PolicyLimitsRow {
  vehicle_id: string;
  quota_limit_km: string;
  consumed_m: string;
  quota_state: 'UNDER_LIMIT' | 'NEAR_LIMIT' | 'EXCEEDED';
  cycle_start_at: Date | null;
  cycle_end_at: Date | null;
  updated_at: Date;
}

export const getTripSummary = async (
  range: StatisticsDateRange,
  interval: StatisticsInterval,
): Promise<TripSummaryPoint[]> => {
  const step = toSeriesStep(interval);
  const bucketExpr = toBucketExpression(interval);

  const query = `
    WITH series AS (
      SELECT generate_series($1::timestamptz, $2::timestamptz, $3::interval) AS ts
    ),
    bucketed AS (
      SELECT
        ${bucketExpr.replace('ts', 'COALESCE(actual_start, planned_start, created_at)')} AS bucket,
        COUNT(*)::text AS total_trips,
        COALESCE(SUM(distance_km), 0)::text AS total_distance_km,
        COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(actual_end, NOW()) - COALESCE(actual_start, planned_start, created_at))) / 60), 0)::text AS avg_duration_minutes
      FROM trips
      WHERE COALESCE(actual_start, planned_start, created_at) BETWEEN $1 AND $2
      GROUP BY bucket
    )
    SELECT
      ${bucketExpr} AS label,
      COALESCE(bucketed.total_trips, '0') AS total_trips,
      COALESCE(bucketed.total_distance_km, '0') AS total_distance_km,
      COALESCE(bucketed.avg_duration_minutes, '0') AS avg_duration_minutes
    FROM series
    LEFT JOIN bucketed ON bucketed.bucket = ${bucketExpr}
    ORDER BY label ASC
  `;

  const result = await pool.query<TripSummaryRow>(query, [range.from, range.to, step]);
  return result.rows.map((row) => ({
    label: row.label.toISOString(),
    totalTrips: parseInt(row.total_trips, 10),
    totalDistanceKm: parseFloat(row.total_distance_km),
    avgDurationMinutes: Math.round(parseFloat(row.avg_duration_minutes) * 100) / 100,
  }));
};

export const getSummaryTotals = async (
  range: StatisticsDateRange,
): Promise<{ totalRuntimeHours: number; totalSessions: number; totalAlerts: number }> => {
  const runtimeExpression = await getDeviceSessionRuntimeExpression();
  const query = `
    WITH session_stats AS (
      SELECT
        COALESCE(SUM(${runtimeExpression}), 0)::text AS total_runtime_seconds,
        COUNT(*)::text AS total_sessions
      FROM device_sessions
      WHERE COALESCE(server_session_start, created_at) BETWEEN $1 AND $2
    ),
    alert_stats AS (
      SELECT COUNT(*)::text AS total_alerts
      FROM alerts
      WHERE created_at BETWEEN $1 AND $2
    )
    SELECT
      ROUND((COALESCE(session_stats.total_runtime_seconds, '0')::numeric / 3600.0), 2)::text AS total_runtime_hours,
      COALESCE(session_stats.total_sessions, '0') AS total_sessions,
      COALESCE(alert_stats.total_alerts, '0') AS total_alerts
    FROM session_stats, alert_stats
  `;

  const result = await pool.query<SummaryTotalsRow>(query, [range.from, range.to]);
  const row = result.rows[0];

  return {
    totalRuntimeHours: Number.parseFloat(row?.total_runtime_hours ?? '0') || 0,
    totalSessions: Number.parseInt(row?.total_sessions ?? '0', 10) || 0,
    totalAlerts: Number.parseInt(row?.total_alerts ?? '0', 10) || 0,
  };
};

export const getPolicyLimitsSummary = async (): Promise<PolicyLimitsRow[]> => {
  const query = `
    SELECT
      s.vehicle_id,
      COALESCE(NULLIF((p.params_json->>'limitKm'), '')::numeric, 0)::text AS quota_limit_km,
      COALESCE(s.consumed_m, 0)::text AS consumed_m,
      s.quota_state,
      s.cycle_start_at,
      s.cycle_end_at,
      s.updated_at
    FROM vehicle_policy_state s
    JOIN vehicle_policies p ON p.id = s.policy_id
    WHERE p.policy_type = 'DISTANCE_QUOTA'
      AND p.status = 'active'
    ORDER BY s.updated_at DESC
    LIMIT 500
  `;

  const result = await pool.query<PolicyLimitsRow>(query);
  return result.rows;
};
