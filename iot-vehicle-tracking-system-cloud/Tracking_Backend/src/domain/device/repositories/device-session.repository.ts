import { findOne, findMany } from '@/infrastructure/database/queries';
import { pool } from '@/infrastructure/database/pool';
import type { DeviceSession } from '@/domain/device/types/device.types';
import {
  eventLogPositionValueSql,
  eventLogValidPositionSql,
} from '@/shared/utils/event-log-telemetry-sql.util';

const GPS_LATITUDE_SQL = eventLogPositionValueSql('latitude', 'e');
const GPS_LONGITUDE_SQL = eventLogPositionValueSql('longitude', 'e');
const GPS_VALID_SQL = eventLogValidPositionSql('e');
const SESSION_WITH_GPS_COUNT_SQL = `s.*, COALESCE(gps.gps_points_count, 0)::int AS gps_points_count`;
const GPS_COUNT_JOIN_SQL = `
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS gps_points_count
    FROM event_logs e
    WHERE e.session_id = s.id
      AND e.event_code = 'mqtt_bridge_rawdata'
      AND ${GPS_VALID_SQL}
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
         COALESCE(
           SUM(
             avg_imu_accel_delta_mps2
             * GREATEST(COALESCE(imu_accel_samples_count, 0), 1)
           ) FILTER (WHERE avg_imu_accel_delta_mps2 IS NOT NULL)
           / NULLIF(
               SUM(GREATEST(COALESCE(imu_accel_samples_count, 0), 1))
                 FILTER (WHERE avg_imu_accel_delta_mps2 IS NOT NULL),
               0
             ),
           0
         ) AS avg_imu_accel_delta_mps2,
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
