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

interface ActiveAlertRow {
  id: number;
  title: string | null;
}

interface ActiveAlertMessageRow {
  id: number;
  message: string | null;
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
  lastSeenTimestampMs?: number,
): Promise<void> => {
  const lastSeenAt = lastSeenTimestampMs ? toIsoTimestamp(lastSeenTimestampMs) : null;

  try {
    if (lastSeenAt) {
      await pool.query(
        `UPDATE devices
         SET current_status = $2,
             last_seen_at = GREATEST(COALESCE(last_seen_at, $3::timestamptz), $3::timestamptz)
         WHERE device_id = $1`,
        [deviceId, status, lastSeenAt],
      );
      return;
    }

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
  deviceTimestampMs: number,
  serverTimestampMs = Date.now(),
): Promise<{ sessionId: number; isNew: boolean }> => {
  const client = await pool.connect();
  const deviceOccurredAt = toIsoTimestamp(deviceTimestampMs);
  const serverOccurredAt = toIsoTimestamp(serverTimestampMs);

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
       VALUES ($1, 'running', $2, $3, 0, $2, NOW(), NOW())
       RETURNING id`,
      [deviceId, serverOccurredAt, deviceOccurredAt],
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
  deviceId: string;
  sessionId: number;
  deviceTimestampMs: number;
  serverTimestampMs?: number;
  vibration?: number;
  latitude?: number;
  longitude?: number;
  speed?: number;
}): Promise<void> => {
  const serverOccurredAt = toIsoTimestamp(params.serverTimestampMs ?? Date.now());

  try {
    await pool.query(
      `UPDATE device_sessions
       SET
         last_update = GREATEST(COALESCE(last_update, $2::timestamptz), $2::timestamptz),
         data_points_count = COALESCE(data_points_count, 0) + 1,
         uptime = GREATEST(
           COALESCE(uptime, 0),
           EXTRACT(EPOCH FROM ($2::timestamptz - COALESCE(server_session_start, created_at)))::int,
           0
         ),
         total_runtime_seconds = GREATEST(
           COALESCE(total_runtime_seconds, 0),
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
        serverOccurredAt,
        params.vibration ?? null,
        params.latitude ?? null,
        params.longitude ?? null,
        params.speed ?? null,
      ],
    );

    await pool.query(
      `UPDATE devices
       SET current_status = 'running',
           last_seen_at = GREATEST(COALESCE(last_seen_at, $2::timestamptz), $2::timestamptz),
           last_latitude = COALESCE($3, last_latitude),
           last_longitude = COALESCE($4, last_longitude),
           last_speed = COALESCE($5, last_speed),
           updated_at = NOW()
       WHERE device_id = $1`,
      [
        params.deviceId,
        serverOccurredAt,
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
           last_update = GREATEST(COALESCE(last_update, $2::timestamptz), $2::timestamptz),
           data_points_count = COALESCE(data_points_count, 0) + 1,
           uptime = GREATEST(
             COALESCE(uptime, 0),
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
          serverOccurredAt,
          params.vibration ?? null,
          params.latitude ?? null,
          params.longitude ?? null,
          params.speed ?? null,
        ],
      );

      await pool.query(
        `UPDATE devices
         SET current_status = 'running',
             last_seen_at = GREATEST(COALESCE(last_seen_at, $2::timestamptz), $2::timestamptz),
             last_latitude = COALESCE($3, last_latitude),
             last_longitude = COALESCE($4, last_longitude),
             last_speed = COALESCE($5, last_speed),
             updated_at = NOW()
         WHERE device_id = $1`,
        [
          params.deviceId,
          serverOccurredAt,
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
  deviceTimestampMs: number,
  knownSessionId?: number | null,
  serverTimestampMs?: number,
): Promise<number | null> => {
  const client = await pool.connect();
  const deviceOccurredAt = toIsoTimestamp(deviceTimestampMs);
  const serverOccurredAt = toIsoTimestamp(serverTimestampMs ?? Date.now());

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
           session_end = $3,
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
        [session.id, serverOccurredAt, deviceOccurredAt],
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
           session_end = $3,
           last_update = $2,
           uptime = GREATEST(
             EXTRACT(EPOCH FROM ($2::timestamptz - COALESCE(server_session_start, created_at)))::int,
             0
           ),
           updated_at = NOW()
         WHERE id = $1
         RETURNING COALESCE(uptime, 0)::text AS runtime_seconds`,
        [session.id, serverOccurredAt, deviceOccurredAt],
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

export const syncActiveObdDtcAlerts = async (
  deviceId: string,
  activeTitles: string[],
  resolutionNotes: string,
): Promise<Set<string>> => {
  const desiredTitles = new Set(
    activeTitles
      .map((item) => item.trim())
      .filter((item) => item.length > 0),
  );

  try {
    const result = await pool.query<ActiveAlertRow>(
      `SELECT id, title
       FROM alerts
       WHERE device_id = $1
         AND alert_type = 'maintenance_due'
         AND status IN ('active', 'acknowledged')
         AND title LIKE 'OBD: DTC %'
       ORDER BY created_at DESC, id DESC`,
      [deviceId],
    );

    const existingActiveTitles = new Set<string>();
    const seenTitles = new Set<string>();
    const idsToResolve: number[] = [];

    result.rows.forEach((row) => {
      const title = String(row.title ?? '').trim();
      if (!title) {
        idsToResolve.push(row.id);
        return;
      }

      if (seenTitles.has(title)) {
        idsToResolve.push(row.id);
        return;
      }

      seenTitles.add(title);
      if (desiredTitles.has(title)) {
        existingActiveTitles.add(title);
        return;
      }

      idsToResolve.push(row.id);
    });

    if (idsToResolve.length > 0) {
      await pool.query(
        `UPDATE alerts
         SET status = 'resolved',
             resolved_at = NOW(),
             resolution_notes = $2,
             updated_at = NOW()
         WHERE id = ANY($1::int[])
           AND status IN ('active', 'acknowledged')`,
        [idsToResolve, resolutionNotes],
      );
    }

    return existingActiveTitles;
  } catch (err) {
    logger.error({ err, deviceId }, 'syncActiveObdDtcAlerts failed');
    return new Set<string>();
  }
};

export const syncActiveMaintenanceAlertsByTitle = async (
  deviceId: string,
  managedTitles: string[],
  activeTitles: string[],
  resolutionNotes: string,
): Promise<Set<string>> => {
  const knownTitles = Array.from(
    new Set(
      managedTitles
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    ),
  );
  if (knownTitles.length === 0) {
    return new Set<string>();
  }

  const desiredTitles = new Set(
    activeTitles
      .map((item) => item.trim())
      .filter((item) => item.length > 0),
  );

  try {
    const result = await pool.query<ActiveAlertRow>(
      `SELECT id, title
       FROM alerts
       WHERE device_id = $1
         AND alert_type = 'maintenance_due'
         AND status IN ('active', 'acknowledged')
         AND title = ANY($2::text[])
       ORDER BY created_at DESC, id DESC`,
      [deviceId, knownTitles],
    );

    const existingActiveTitles = new Set<string>();
    const seenTitles = new Set<string>();
    const idsToResolve: number[] = [];

    result.rows.forEach((row) => {
      const title = String(row.title ?? '').trim();
      if (!title) {
        idsToResolve.push(row.id);
        return;
      }

      if (seenTitles.has(title)) {
        idsToResolve.push(row.id);
        return;
      }

      seenTitles.add(title);
      if (desiredTitles.has(title)) {
        existingActiveTitles.add(title);
        return;
      }

      idsToResolve.push(row.id);
    });

    if (idsToResolve.length > 0) {
      await pool.query(
        `UPDATE alerts
         SET status = 'resolved',
             resolved_at = NOW(),
             resolution_notes = $2,
             updated_at = NOW()
         WHERE id = ANY($1::int[])
           AND status IN ('active', 'acknowledged')`,
        [idsToResolve, resolutionNotes],
      );
    }

    return existingActiveTitles;
  } catch (err) {
    logger.error({ err, deviceId }, 'syncActiveMaintenanceAlertsByTitle failed');
    return new Set<string>();
  }
};

export const syncActiveMaintenanceAlertsByMessage = async (
  deviceId: string,
  title: string,
  managedMessages: string[],
  activeMessages: string[],
  resolutionNotes: string,
): Promise<Set<string>> => {
  const normalizedTitle = title.trim();
  const knownMessages = Array.from(
    new Set(
      managedMessages
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    ),
  );
  if (!normalizedTitle || knownMessages.length === 0) {
    return new Set<string>();
  }

  const desiredMessages = new Set(
    activeMessages
      .map((item) => item.trim())
      .filter((item) => knownMessages.includes(item)),
  );

  try {
    const result = await pool.query<ActiveAlertMessageRow>(
      `SELECT id, message
       FROM alerts
       WHERE device_id = $1
         AND alert_type = 'maintenance_due'
         AND status IN ('active', 'acknowledged')
         AND title = $2
         AND message = ANY($3::text[])
       ORDER BY created_at DESC, id DESC`,
      [deviceId, normalizedTitle, knownMessages],
    );

    const existingActiveMessages = new Set<string>();
    const seenMessages = new Set<string>();
    const idsToResolve: number[] = [];

    result.rows.forEach((row) => {
      const message = String(row.message ?? '').trim();
      if (!message) {
        idsToResolve.push(row.id);
        return;
      }

      if (seenMessages.has(message)) {
        idsToResolve.push(row.id);
        return;
      }

      seenMessages.add(message);
      if (desiredMessages.has(message)) {
        existingActiveMessages.add(message);
        return;
      }

      idsToResolve.push(row.id);
    });

    if (idsToResolve.length > 0) {
      await pool.query(
        `UPDATE alerts
         SET status = 'resolved',
             resolved_at = NOW(),
             resolution_notes = $2,
             updated_at = NOW()
         WHERE id = ANY($1::int[])
           AND status IN ('active', 'acknowledged')`,
        [idsToResolve, resolutionNotes],
      );
    }

    return existingActiveMessages;
  } catch (err) {
    logger.error({ err, deviceId, title: normalizedTitle }, 'syncActiveMaintenanceAlertsByMessage failed');
    return new Set<string>();
  }
};
