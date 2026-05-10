import { findOne, findMany } from '@/infrastructure/database/queries';
import { pool } from '@/infrastructure/database/pool';
import type { DeviceSession } from '@/domain/device/types/device.types';

const GPS_LATITUDE_SQL =
  "COALESCE(e.context#>>'{raw_payload,data,latitude}', e.context->>'latitude', e.metadata->>'latitude')";
const GPS_LONGITUDE_SQL =
  "COALESCE(e.context#>>'{raw_payload,data,longitude}', e.context->>'longitude', e.metadata->>'longitude')";
const GPS_EVENT_LOCAL_SESSION_KEY_SQL = "e.context#>>'{raw_payload,local_session_key}'";
const GPS_EVENT_BOOT_ID_SQL =
  "COALESCE(e.context#>>'{raw_payload,boot_id}', e.context#>>'{raw_payload,metadata,boot_id}')";
const SESSION_CLOSE_TIMESTAMP_SQL = 'COALESCE(s.session_end, s.server_session_end)';
const EVENT_TIMESTAMP_SQL = 'COALESCE(e.device_timestamp, e.server_timestamp)';
const SESSION_WITH_GPS_COUNT_SQL = `
  s.*,
  COALESCE(gps.gps_points_count, 0)::int AS gps_points_count
`;
const GPS_COUNT_JOIN_SQL = `
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS gps_points_count
    FROM event_logs e
    WHERE (
        e.session_id = s.id
        OR (
          e.session_id IS NULL
          AND e.device_id = s.device_id
          AND s.status = 'completed'
          AND ${SESSION_CLOSE_TIMESTAMP_SQL} IS NOT NULL
          AND ${EVENT_TIMESTAMP_SQL} BETWEEN
            ${SESSION_CLOSE_TIMESTAMP_SQL} - INTERVAL '15 seconds'
            AND ${SESSION_CLOSE_TIMESTAMP_SQL} + INTERVAL '60 seconds'
          AND (
            (
              ${GPS_EVENT_LOCAL_SESSION_KEY_SQL} ~ '^[0-9]+$'
              AND s.local_session_key IS NOT NULL
              AND (${GPS_EVENT_LOCAL_SESSION_KEY_SQL})::bigint = s.local_session_key
            )
            OR (
              ${GPS_EVENT_BOOT_ID_SQL} IS NOT NULL
              AND s.firmware_boot_id IS NOT NULL
              AND ${GPS_EVENT_BOOT_ID_SQL} = s.firmware_boot_id
            )
          )
        )
      )
      AND e.event_code = 'mqtt_bridge_rawdata'
      AND ${GPS_LATITUDE_SQL} IS NOT NULL
      AND ${GPS_LONGITUDE_SQL} IS NOT NULL
  ) gps ON TRUE
`;

export const findByDeviceId = async (deviceId: string, limit = 20): Promise<DeviceSession[]> =>
  findMany<DeviceSession>(
    `SELECT ${SESSION_WITH_GPS_COUNT_SQL}
     FROM device_sessions s
     ${GPS_COUNT_JOIN_SQL}
     WHERE s.device_id = $1
     ORDER BY s.created_at DESC
     LIMIT $2`,
    [deviceId, limit],
  );

export const findCurrentSession = async (deviceId: string): Promise<DeviceSession | null> =>
  findOne<DeviceSession>(
    `SELECT ${SESSION_WITH_GPS_COUNT_SQL}
     FROM device_sessions s
     ${GPS_COUNT_JOIN_SQL}
     WHERE s.device_id = $1 AND s.status = 'running'
     ORDER BY s.created_at DESC
     LIMIT 1`,
    [deviceId],
  );

export const findById = async (id: number): Promise<DeviceSession | null> =>
  findOne<DeviceSession>(
    `SELECT ${SESSION_WITH_GPS_COUNT_SQL}
     FROM device_sessions s
     ${GPS_COUNT_JOIN_SQL}
     WHERE s.id = $1`,
    [id],
  );

export const getSessionStats = async (
  deviceId: string,
): Promise<{
  totalSessions: number;
  avgUptime: number;
  avgImuAccelDeltaMps2: number;
  totalDataPoints: number;
}> => {
  let result;
  try {
    result = await pool.query(
      `SELECT
         COUNT(*)::int AS total_sessions,
         COALESCE(
           AVG(
             COALESCE(
               uptime,
               EXTRACT(
                 EPOCH FROM (
                   COALESCE(server_session_end, NOW()) - COALESCE(server_session_start, created_at)
                 )
               )
             )
           ),
           0
         ) AS avg_uptime,
         COALESCE(AVG(avg_imu_accel_delta_mps2), 0) AS avg_imu_accel_delta_mps2,
         COALESCE(SUM(data_points_count), 0)::int AS total_data_points
       FROM device_sessions
       WHERE device_id = $1`,
      [deviceId],
    );
  } catch {
    result = await pool.query(
      `SELECT
         COUNT(*)::int AS total_sessions,
         COALESCE(
           AVG(
             COALESCE(
               uptime,
               EXTRACT(
                 EPOCH FROM (
                   COALESCE(server_session_end, NOW()) - COALESCE(server_session_start, created_at)
                 )
               )
             )
           ),
           0
         ) AS avg_uptime,
         COALESCE(AVG(avg_vibration), 0) AS avg_vibration,
         COALESCE(SUM(data_points_count), 0)::int AS total_data_points
       FROM device_sessions
       WHERE device_id = $1`,
      [deviceId],
    );
  }

  const row = result.rows[0];
  return {
    totalSessions: parseInt(row.total_sessions, 10),
    avgUptime: parseFloat(row.avg_uptime),
    avgImuAccelDeltaMps2: parseFloat(row.avg_imu_accel_delta_mps2 ?? row.avg_vibration),
    totalDataPoints: parseInt(row.total_data_points, 10),
  };
};

export const countByDeviceId = async (deviceId: string): Promise<number> => {
  const result = await pool.query(
    'SELECT COUNT(*)::int AS total FROM device_sessions WHERE device_id = $1',
    [deviceId],
  );
  return parseInt(result.rows[0].total, 10);
};

export const findByDeviceIdPaginated = async (
  deviceId: string,
  page: number,
  limit: number,
): Promise<DeviceSession[]> => {
  const offset = (page - 1) * limit;
  return findMany<DeviceSession>(
    `SELECT ${SESSION_WITH_GPS_COUNT_SQL}
     FROM device_sessions s
     ${GPS_COUNT_JOIN_SQL}
     WHERE s.device_id = $1
     ORDER BY s.created_at DESC
     LIMIT $2 OFFSET $3`,
    [deviceId, limit, offset],
  );
};
