import { Pool } from 'pg';
import { dbConfig } from '../config/env';
import { logger } from './logger';

export const pool = new Pool({
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  max: 20,
});

export const query = <T extends object = Record<string, unknown>>(
  text: string,
  params?: unknown[],
) => pool.query<T>(text, params);

export const closePool = () => pool.end();

interface DeviceRow {
  id: string;
  device_id: string;
  vehicle_id: string | null;
  current_status: string;
}

interface DeviceSessionRow {
  id: number;
  runtime_seconds?: string | number | null;
}

const toIsoTimestamp = (timestampMs: number) => new Date(timestampMs).toISOString();

/**
 * Validate device by checking device_id and comparing auth_token hash.
 * The devices table stores auth_token as SHA-256 hash.
 */
export const validateDevice = async (
  deviceId: string,
  authToken: string,
): Promise<DeviceRow | null> => {
  try {
    const result = await pool.query<DeviceRow>(
      `SELECT id, device_id, vehicle_id, current_status
       FROM devices
       WHERE device_id = $1
         AND auth_token = encode(sha256($2::bytea), 'hex')
         AND is_active = true`,
      [deviceId, authToken],
    );
    return result.rows[0] ?? null;
  } catch (err) {
    logger.error({ err, deviceId }, 'validateDevice failed');
    return null;
  }
};

/**
 * Update device status and last_seen_at timestamp.
 */
export const updateDeviceStatus = async (
  deviceId: string,
  status: string,
): Promise<void> => {
  try {
    await pool.query(
      `UPDATE devices
       SET current_status = $2, last_seen_at = NOW()
       WHERE device_id = $1`,
      [deviceId, status],
    );
  } catch (err) {
    logger.error({ err, deviceId }, 'updateDeviceStatus failed');
  }
};

export const ensureDeviceSession = async (
  deviceId: string,
  timestampMs: number,
): Promise<{ sessionId: number; isNew: boolean }> => {
  const client = await pool.connect();
  const occurredAt = toIsoTimestamp(timestampMs);

  try {
    await client.query('BEGIN');

    const active = await client.query<DeviceSessionRow>(
      `SELECT id
       FROM device_sessions
       WHERE device_id = $1 AND status = 'running'
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [deviceId],
    );

    const existing = active.rows[0];
    if (existing) {
      await client.query('COMMIT');
      return { sessionId: existing.id, isNew: false };
    }

    const created = await client.query<DeviceSessionRow>(
      `INSERT INTO device_sessions (
         device_id,
         status,
         server_session_start,
         session_start,
         data_points_count,
         last_update,
         created_at,
         updated_at
       )
       VALUES ($1, 'running', $2, $2, 0, $2, NOW(), NOW())
       RETURNING id`,
      [deviceId, occurredAt],
    );

    await client.query('COMMIT');
    return { sessionId: created.rows[0].id, isNew: true };
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err, deviceId }, 'ensureDeviceSession failed');
    throw err;
  } finally {
    client.release();
  }
};

export const touchDeviceSession = async (params: {
  sessionId: number;
  timestampMs: number;
  vibration?: number;
  latitude?: number;
  longitude?: number;
  speed?: number;
}): Promise<void> => {
  const occurredAt = toIsoTimestamp(params.timestampMs);

  try {
    await pool.query(
      `UPDATE device_sessions
       SET
         last_update = $2,
         data_points_count = COALESCE(data_points_count, 0) + 1,
         uptime = GREATEST(
           EXTRACT(EPOCH FROM ($2::timestamptz - COALESCE(server_session_start, created_at)))::int,
           0
         ),
         total_runtime_seconds = GREATEST(
           EXTRACT(EPOCH FROM ($2::timestamptz - COALESCE(server_session_start, created_at)))::int,
           0
         ),
         avg_vibration = CASE
           WHEN $3::numeric IS NULL THEN avg_vibration
           WHEN avg_vibration IS NULL THEN $3::numeric
           ELSE ROUND(((avg_vibration + $3::numeric) / 2)::numeric, 2)
         END,
         last_latitude = COALESCE($4, last_latitude),
         last_longitude = COALESCE($5, last_longitude),
         last_speed = COALESCE($6, last_speed),
         updated_at = NOW()
       WHERE id = $1`,
      [
        params.sessionId,
        occurredAt,
        params.vibration ?? null,
        params.latitude ?? null,
        params.longitude ?? null,
        params.speed ?? null,
      ],
    );
  } catch (err) {
    try {
      await pool.query(
        `UPDATE device_sessions
         SET
           last_update = $2,
           data_points_count = COALESCE(data_points_count, 0) + 1,
           uptime = GREATEST(
             EXTRACT(EPOCH FROM ($2::timestamptz - COALESCE(server_session_start, created_at)))::int,
             0
           ),
           avg_vibration = CASE
             WHEN $3::numeric IS NULL THEN avg_vibration
             WHEN avg_vibration IS NULL THEN $3::numeric
             ELSE ROUND(((avg_vibration + $3::numeric) / 2)::numeric, 2)
           END,
           last_latitude = COALESCE($4, last_latitude),
           last_longitude = COALESCE($5, last_longitude),
           last_speed = COALESCE($6, last_speed),
           updated_at = NOW()
         WHERE id = $1`,
        [
          params.sessionId,
          occurredAt,
          params.vibration ?? null,
          params.latitude ?? null,
          params.longitude ?? null,
          params.speed ?? null,
        ],
      );
    } catch (fallbackErr) {
      logger.error({ err: fallbackErr, sessionId: params.sessionId }, 'touchDeviceSession failed');
      throw fallbackErr;
    }
  }
};

export const completeDeviceSession = async (
  deviceId: string,
  timestampMs: number,
  knownSessionId?: number | null,
): Promise<number | null> => {
  const client = await pool.connect();
  const occurredAt = toIsoTimestamp(timestampMs);

  try {
    await client.query('BEGIN');

    const active = knownSessionId
      ? await client.query<DeviceSessionRow>(
          `SELECT id
           FROM device_sessions
           WHERE id = $1 AND device_id = $2 AND status = 'running'
           LIMIT 1
           FOR UPDATE`,
          [knownSessionId, deviceId],
        )
      : await client.query<DeviceSessionRow>(
          `SELECT id
           FROM device_sessions
           WHERE device_id = $1 AND status = 'running'
           ORDER BY created_at DESC
           LIMIT 1
           FOR UPDATE`,
          [deviceId],
        );

    const session = active.rows[0];
    if (!session) {
      await client.query('COMMIT');
      return null;
    }

    let runtimeSeconds = 0;

    try {
      await client.query('SAVEPOINT complete_device_session');

      const completed = await client.query<DeviceSessionRow>(
        `UPDATE device_sessions
         SET
           status = 'completed',
           server_session_end = $2,
           session_end = $2,
           last_update = $2,
           uptime = GREATEST(
             EXTRACT(EPOCH FROM ($2::timestamptz - COALESCE(server_session_start, created_at)))::int,
             0
           ),
           total_runtime_seconds = GREATEST(
             EXTRACT(EPOCH FROM ($2::timestamptz - COALESCE(server_session_start, created_at)))::int,
             0
           ),
           updated_at = NOW()
         WHERE id = $1
         RETURNING COALESCE(total_runtime_seconds, uptime, 0)::text AS runtime_seconds`,
        [session.id, occurredAt],
      );

      runtimeSeconds = Number.parseInt(String(completed.rows[0]?.runtime_seconds ?? '0'), 10);
      await client.query('RELEASE SAVEPOINT complete_device_session');
    } catch {
      await client.query('ROLLBACK TO SAVEPOINT complete_device_session');
      await client.query('RELEASE SAVEPOINT complete_device_session');

      const completed = await client.query<DeviceSessionRow>(
        `UPDATE device_sessions
         SET
           status = 'completed',
           server_session_end = $2,
           session_end = $2,
           last_update = $2,
           uptime = GREATEST(
             EXTRACT(EPOCH FROM ($2::timestamptz - COALESCE(server_session_start, created_at)))::int,
             0
           ),
           updated_at = NOW()
         WHERE id = $1
         RETURNING COALESCE(uptime, 0)::text AS runtime_seconds`,
        [session.id, occurredAt],
      );

      runtimeSeconds = Number.parseInt(String(completed.rows[0]?.runtime_seconds ?? '0'), 10);
    }

    await client.query(
      `UPDATE devices
       SET total_runtime_seconds = COALESCE(total_runtime_seconds, 0) + $2, updated_at = NOW()
       WHERE device_id = $1`,
      [deviceId, Math.max(runtimeSeconds, 0)],
    );

    await client.query('COMMIT');
    return session.id;
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err, deviceId }, 'completeDeviceSession failed');
    throw err;
  } finally {
    client.release();
  }
};
