import { Pool } from 'pg';
import { dbConfig } from '../config/env';
import { logger } from './logger';
import type { RuntimeStateSnapshot } from '../types/device-state.types';
import {
  canHydrateSessionIdentity,
  hasSessionIdentityConflict,
} from '../utils/session-identity.util';

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
  last_seen_at: string | null;
  state_updated_at: string | null;
}

interface DeviceSessionRow {
  id: number;
  status?: string | null;
  runtime_seconds?: string | number | null;
  data_points_count?: string | number | null;
  local_session_key?: string | number | null;
  firmware_boot_id?: string | null;
  boundary_source?: string | null;
}

interface SessionIdentityInput {
  localSessionKey?: number;
  canonicalSessionId?: string | null;
  bootId?: string;
  canonicalSource?: string;
  boundarySource?: string;
  startReason?: string;
  endReason?: string;
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
const TRANSIENT_HEARTBEAT_SESSION_MAX_RUNTIME_SECONDS = 120;
const TRANSIENT_HEARTBEAT_SESSION_MAX_DATA_POINTS = 1;
const TRANSIENT_AUTHORITATIVE_SESSION_MAX_DATA_POINTS = 0;
const SESSION_CLOSE_LOOKBACK_MS = 15_000;
const SESSION_CLOSE_LOOKAHEAD_MS = 60_000;
const toInt = (value: string | number | null | undefined): number => {
  const parsed = Number.parseInt(String(value ?? '0'), 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toOptionalPositiveInt = (value: string | number | null | undefined): number | null => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

/**
 * Validate device by checking device_id and comparing auth_token.
 * Devices normally send the raw token; internal simulators may already have
 * the SHA-256 value stored in devices.auth_token.
 */
export const validateDevice = async (
  deviceId: string,
  authToken: string,
): Promise<DeviceRow | null> => {
  try {
    const result = await pool.query<DeviceRow>(
      `SELECT id, device_id, vehicle_id, current_status
            , last_seen_at, state_updated_at
       FROM devices
       WHERE device_id = $1
         AND (
           auth_token = encode(sha256($2::bytea), 'hex')
           OR auth_token = $3
         )
         AND is_active = true`,
      [deviceId, authToken, authToken],
    );
    return result.rows[0] ?? null;
  } catch (err) {
    logger.error({ err, deviceId, event: 'validate_device_failed' }, 'Validate device failed');
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
  runtimeState?: RuntimeStateSnapshot | null,
): Promise<void> => {
  const lastSeenAt = lastSeenTimestampMs ? toIsoTimestamp(lastSeenTimestampMs) : null;
  const stateUpdatedAt = lastSeenAt ?? new Date().toISOString();

  try {
    if (lastSeenAt && runtimeState) {
      await pool.query(
        `UPDATE devices
         SET current_status = $2,
             ignition_state = $3,
             motion_state = $4,
             vehicle_state = $5,
             device_state = $6,
             sleep_mode = $7,
             state_updated_at = GREATEST(COALESCE(state_updated_at, $8::timestamptz), $8::timestamptz),
             last_seen_at = GREATEST(COALESCE(last_seen_at, $8::timestamptz), $8::timestamptz)
         WHERE device_id = $1`,
        [
          deviceId,
          status,
          runtimeState.ignition_state,
          runtimeState.motion_state,
          runtimeState.vehicle_state,
          runtimeState.device_state,
          runtimeState.sleep_mode,
          stateUpdatedAt,
        ],
      );
      return;
    }

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

    if (runtimeState) {
      await pool.query(
        `UPDATE devices
         SET current_status = $2,
             ignition_state = $3,
             motion_state = $4,
             vehicle_state = $5,
             device_state = $6,
             sleep_mode = $7,
             state_updated_at = $8::timestamptz,
             last_seen_at = NOW()
         WHERE device_id = $1`,
        [
          deviceId,
          status,
          runtimeState.ignition_state,
          runtimeState.motion_state,
          runtimeState.vehicle_state,
          runtimeState.device_state,
          runtimeState.sleep_mode,
          stateUpdatedAt,
        ],
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
    logger.error({ err, deviceId, event: 'update_device_status_failed' }, 'Update device status failed');
  }
};

export const ensureDeviceSession = async (
  deviceId: string,
  deviceTimestampMs: number,
  serverTimestampMs = Date.now(),
  sessionIdentity: SessionIdentityInput = {},
): Promise<{ sessionId: number; isNew: boolean; status: string }> => {
  const client = await pool.connect();
  const deviceOccurredAt = toIsoTimestamp(deviceTimestampMs);
  const serverOccurredAt = toIsoTimestamp(serverTimestampMs);
  const localSessionKey = sessionIdentity.localSessionKey ?? null;
  const firmwareBootId = sessionIdentity.bootId?.trim() || null;
  const canonicalSource = sessionIdentity.canonicalSource ?? 'server';
  const boundarySource = sessionIdentity.boundarySource ?? 'firmware';
  const startReason = sessionIdentity.startReason ?? 'ignition_on';
  const hasAuthoritativeIdentity = localSessionKey !== null && firmwareBootId !== null;

  try {
    await client.query('BEGIN');

    const retireStaleRunningSessions = async (
      keepSessionId?: number,
    ): Promise<void> => {
      await client.query(
        `UPDATE device_sessions
         SET
           status = 'completed',
           server_session_end = COALESCE(server_session_end, $2),
           session_end = COALESCE(session_end, $3),
           end_reason = COALESCE(end_reason, 'superseded'),
           boundary_source = COALESCE(boundary_source, $4),
           last_update = GREATEST(COALESCE(last_update, $2::timestamptz), $2::timestamptz),
           uptime = GREATEST(
             COALESCE(
               uptime,
               EXTRACT(EPOCH FROM ($2::timestamptz - COALESCE(server_session_start, created_at)))::int
             ),
             0
           ),
           total_runtime_seconds = GREATEST(
             COALESCE(
               total_runtime_seconds,
               EXTRACT(EPOCH FROM ($2::timestamptz - COALESCE(server_session_start, created_at)))::int
             ),
             0
           ),
           updated_at = NOW()
         WHERE device_id = $1
           AND status = 'running'
           AND ($5::bigint IS NULL OR id <> $5::bigint)`,
        [
          deviceId,
          serverOccurredAt,
          deviceOccurredAt,
          boundarySource,
          keepSessionId ?? null,
        ],
      );
    };

    if (hasAuthoritativeIdentity) {
      const matchedByIdentity = await client.query<DeviceSessionRow>(
        `SELECT id, status
         FROM device_sessions
         WHERE device_id = $1
           AND firmware_boot_id = $2
           AND local_session_key = $3
         ORDER BY created_at DESC
         LIMIT 1
         FOR UPDATE`,
        [deviceId, firmwareBootId, localSessionKey],
      );

      const existingByIdentity = matchedByIdentity.rows[0];
      if (existingByIdentity) {
        await retireStaleRunningSessions(existingByIdentity.id);
        await client.query(
          `UPDATE device_sessions
           SET canonical_source = $2,
               boundary_source = $3,
               start_reason = COALESCE(start_reason, $4),
               updated_at = NOW()
           WHERE id = $1`,
          [existingByIdentity.id, canonicalSource, boundarySource, startReason],
        );
        await client.query('COMMIT');
        return {
          sessionId: existingByIdentity.id,
          isNew: false,
          status: existingByIdentity.status ?? 'running',
        };
      }

      const active = await client.query<DeviceSessionRow>(
        `SELECT id, status, local_session_key, firmware_boot_id, boundary_source
         FROM device_sessions
         WHERE device_id = $1 AND status = 'running'
         ORDER BY created_at DESC
         LIMIT 1
         FOR UPDATE`,
        [deviceId],
      );

      const existing = active.rows[0];
      if (
        existing &&
        !hasSessionIdentityConflict(
          {
            localSessionKey: toOptionalPositiveInt(existing.local_session_key),
            bootId: existing.firmware_boot_id,
          },
          {
            localSessionKey,
            bootId: firmwareBootId,
          },
        ) &&
        (
          existing.boundary_source === 'bridge_fallback' ||
          canHydrateSessionIdentity(
            {
              localSessionKey: toOptionalPositiveInt(existing.local_session_key),
              bootId: existing.firmware_boot_id,
            },
            {
              localSessionKey,
              bootId: firmwareBootId,
            },
          )
        )
      ) {
        await client.query(
          `UPDATE device_sessions
           SET local_session_key = COALESCE(local_session_key, $2::bigint),
               firmware_boot_id = COALESCE(firmware_boot_id, $3),
               canonical_source = $4,
               boundary_source = $5,
               start_reason = COALESCE(start_reason, $6),
               updated_at = NOW()
           WHERE id = $1`,
          [
            existing.id,
            localSessionKey,
            firmwareBootId,
            canonicalSource,
            boundarySource,
            startReason,
          ],
        );
        await client.query('COMMIT');
        return {
          sessionId: existing.id,
          isNew: false,
          status: existing.status ?? 'running',
        };
      }
    }

    if (!hasAuthoritativeIdentity) {
      const active = await client.query<DeviceSessionRow>(
        `SELECT id, status, local_session_key, firmware_boot_id
         FROM device_sessions
         WHERE device_id = $1 AND status = 'running'
         ORDER BY created_at DESC
         LIMIT 1
         FOR UPDATE`,
        [deviceId],
      );

      const existing = active.rows[0];
      if (existing) {
        if (
          hasSessionIdentityConflict(
            {
              localSessionKey: toOptionalPositiveInt(existing.local_session_key),
              bootId: existing.firmware_boot_id,
            },
            {
              localSessionKey,
              bootId: firmwareBootId,
            },
          )
        ) {
          await retireStaleRunningSessions();
        } else {
          await client.query(
            `UPDATE device_sessions
             SET canonical_source = $2,
                 boundary_source = $3,
                 start_reason = COALESCE(start_reason, $4),
                 updated_at = NOW()
             WHERE id = $1`,
            [existing.id, canonicalSource, boundarySource, startReason],
          );
          await client.query('COMMIT');
          return { sessionId: existing.id, isNew: false, status: existing.status ?? 'running' };
        }
      }
    }

    await retireStaleRunningSessions();

    const created = await client.query<DeviceSessionRow>(
      `INSERT INTO device_sessions (
         device_id,
         status,
         server_session_start,
         session_start,
         local_session_key,
         firmware_boot_id,
         canonical_source,
         boundary_source,
         start_reason,
         data_points_count,
         last_update,
         created_at,
         updated_at
       )
       VALUES ($1, 'running', $2, $3, $4, $5, $6, $7, $8, 0, $2, NOW(), NOW())
       RETURNING id, status`,
      [
        deviceId,
        serverOccurredAt,
        deviceOccurredAt,
        localSessionKey,
        firmwareBootId,
        canonicalSource,
        boundarySource,
        startReason,
      ],
    );

    await client.query('COMMIT');
    return {
      sessionId: created.rows[0].id,
      isNew: true,
      status: created.rows[0].status ?? 'running',
    };
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error(
      { err, deviceId, localSessionKey, firmwareBootId, event: 'ensure_device_session_failed' },
      'Ensure device session failed',
    );
    throw err;
  } finally {
    client.release();
  }
};

export const findDeviceSessionIdByIdentity = async (
  deviceId: string,
  sessionIdentity: Pick<SessionIdentityInput, 'localSessionKey' | 'canonicalSessionId' | 'bootId'>,
): Promise<number | null> => {
  const canonicalSessionId = toOptionalPositiveInt(sessionIdentity.canonicalSessionId);
  const localSessionKey = sessionIdentity.localSessionKey ?? null;
  const firmwareBootId = sessionIdentity.bootId?.trim() || null;

  try {
    if (canonicalSessionId !== null) {
      const result = await pool.query<DeviceSessionRow>(
        `SELECT id
         FROM device_sessions
         WHERE id = $1 AND device_id = $2
         LIMIT 1`,
        [canonicalSessionId, deviceId],
      );
      return result.rows[0]?.id ?? null;
    }

    if (localSessionKey !== null && firmwareBootId !== null) {
      const result = await pool.query<DeviceSessionRow>(
        `SELECT id
         FROM device_sessions
         WHERE device_id = $1
           AND firmware_boot_id = $2
           AND local_session_key = $3
         ORDER BY created_at DESC
         LIMIT 1`,
        [deviceId, firmwareBootId, localSessionKey],
      );
      if (result.rows[0]?.id) {
        return result.rows[0].id;
      }

      const fallbackCandidate = await pool.query<DeviceSessionRow>(
        `SELECT id, local_session_key, firmware_boot_id, boundary_source
         FROM device_sessions
         WHERE device_id = $1
           AND status = 'running'
           AND (
             boundary_source = 'bridge_fallback'
             OR local_session_key IS NULL
             OR firmware_boot_id IS NULL
           )
         ORDER BY created_at DESC
         LIMIT 5`,
        [deviceId],
      );

      const adopted = fallbackCandidate.rows.find((candidate) =>
        !hasSessionIdentityConflict(
          {
            localSessionKey: toOptionalPositiveInt(candidate.local_session_key),
            bootId: candidate.firmware_boot_id,
          },
          {
            localSessionKey,
            bootId: firmwareBootId,
          },
        ),
      );
      return adopted?.id ?? null;
    }

    if (firmwareBootId !== null) {
      const result = await pool.query<DeviceSessionRow>(
        `SELECT id
         FROM device_sessions
         WHERE device_id = $1
           AND firmware_boot_id = $2
           AND status = 'running'
         ORDER BY created_at DESC
         LIMIT 1`,
        [deviceId, firmwareBootId],
      );
      return result.rows[0]?.id ?? null;
    }

    return null;
  } catch (err) {
    logger.error(
      { err, deviceId, localSessionKey, firmwareBootId, event: 'find_device_session_id_by_identity_failed' },
      'Find device session by identity failed',
    );
    return null;
  }
};

export const findClosingDeviceSessionIdByIdentity = async (
  deviceId: string,
  sessionIdentity: Pick<SessionIdentityInput, 'localSessionKey' | 'bootId'>,
  deviceTimestampMs: number,
  serverTimestampMs = Date.now(),
): Promise<number | null> => {
  const localSessionKey = sessionIdentity.localSessionKey ?? null;
  const firmwareBootId = sessionIdentity.bootId?.trim() || null;

  if (localSessionKey === null && firmwareBootId === null) {
    return null;
  }

  try {
    const result = await pool.query<DeviceSessionRow>(
      `SELECT id
       FROM device_sessions
       WHERE device_id = $1
         AND status = 'completed'
         AND (
           ($4::bigint IS NOT NULL AND local_session_key = $4::bigint)
           OR ($5::text IS NOT NULL AND firmware_boot_id = $5)
         )
         AND (
           (
             session_end IS NOT NULL
             AND $2::timestamptz BETWEEN
               session_end - ($6::int * INTERVAL '1 millisecond')
               AND session_end + ($7::int * INTERVAL '1 millisecond')
           )
           OR (
             server_session_end IS NOT NULL
             AND $3::timestamptz BETWEEN
               server_session_end - ($6::int * INTERVAL '1 millisecond')
               AND server_session_end + ($7::int * INTERVAL '1 millisecond')
           )
         )
       ORDER BY
         CASE
           WHEN session_end IS NULL THEN 999999999
           ELSE ABS(EXTRACT(EPOCH FROM ($2::timestamptz - session_end)))
         END ASC,
         CASE
           WHEN server_session_end IS NULL THEN 999999999
           ELSE ABS(EXTRACT(EPOCH FROM ($3::timestamptz - server_session_end)))
         END ASC,
         id DESC
       LIMIT 1`,
      [
        deviceId,
        toIsoTimestamp(deviceTimestampMs),
        toIsoTimestamp(serverTimestampMs),
        localSessionKey,
        firmwareBootId,
        SESSION_CLOSE_LOOKBACK_MS,
        SESSION_CLOSE_LOOKAHEAD_MS,
      ],
    );
    return result.rows[0]?.id ?? null;
  } catch (err) {
    logger.error(
      { err, deviceId, localSessionKey, firmwareBootId, event: 'find_closing_device_session_id_failed' },
      'Find closing device session failed',
    );
    return null;
  }
};

export const touchDeviceSession = async (params: {
  deviceId: string;
  sessionId: number;
  deviceTimestampMs: number;
  serverTimestampMs?: number;
  imuAccelDeltaMps2?: number;
  vehicleBattery?: number;
  deviceBattery?: number;
  latitude?: number;
  longitude?: number;
  speed?: number;
  allowCompleted?: boolean;
  updateDeviceState?: boolean;
}): Promise<void> => {
  const serverOccurredAt = toIsoTimestamp(params.serverTimestampMs ?? Date.now());
  const allowCompleted = params.allowCompleted === true;
  const updateDeviceState = params.updateDeviceState !== false;
  const sessionStatusPredicate = allowCompleted
    ? "status IN ('running', 'completed')"
    : "status = 'running'";

  try {
    const touched = await pool.query(
      `UPDATE device_sessions
       SET
         last_update = GREATEST(COALESCE(last_update, $2::timestamptz), $2::timestamptz),
         data_points_count = COALESCE(data_points_count, 0) + 1,
         uptime = CASE
           WHEN status = 'running' THEN GREATEST(
             COALESCE(uptime, 0),
             EXTRACT(EPOCH FROM ($2::timestamptz - COALESCE(server_session_start, created_at)))::int,
             0
           )
           ELSE uptime
         END,
         total_runtime_seconds = CASE
           WHEN status = 'running' THEN GREATEST(
             COALESCE(total_runtime_seconds, 0),
             EXTRACT(EPOCH FROM ($2::timestamptz - COALESCE(server_session_start, created_at)))::int,
             0
           )
           ELSE total_runtime_seconds
         END,
         avg_imu_accel_delta_mps2 = CASE
           WHEN $3::numeric IS NULL THEN avg_imu_accel_delta_mps2
           WHEN avg_imu_accel_delta_mps2 IS NULL THEN $3::numeric
           ELSE ROUND(((avg_imu_accel_delta_mps2 + $3::numeric) / 2)::numeric, 3)
         END,
         avg_vehicle_battery = CASE
           WHEN $4::numeric IS NULL THEN avg_vehicle_battery
           WHEN avg_vehicle_battery IS NULL THEN $4::numeric
           ELSE ROUND(((avg_vehicle_battery + $4::numeric) / 2)::numeric, 2)
         END,
         avg_device_battery = CASE
           WHEN $5::numeric IS NULL THEN avg_device_battery
           WHEN avg_device_battery IS NULL THEN $5::numeric
           ELSE ROUND(((avg_device_battery + $5::numeric) / 2)::numeric, 2)
         END,
         last_latitude = COALESCE($6, last_latitude),
         last_longitude = COALESCE($7, last_longitude),
         last_speed = COALESCE($8, last_speed),
         updated_at = NOW()
       WHERE id = $1 AND device_id = $9 AND ${sessionStatusPredicate}
       RETURNING id`,
      [
        params.sessionId,
        serverOccurredAt,
        params.imuAccelDeltaMps2 ?? null,
        params.vehicleBattery ?? null,
        params.deviceBattery ?? null,
        params.latitude ?? null,
        params.longitude ?? null,
        params.speed ?? null,
        params.deviceId,
      ],
    );

    if (touched.rowCount === 0) {
      logger.warn(
        { sessionId: params.sessionId, deviceId: params.deviceId, event: 'touch_device_session_skipped', reason: 'session_not_touchable' },
        'Touch device session skipped',
      );
      return;
    }

    if (!updateDeviceState) {
      return;
    }

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
      const touched = await pool.query(
        `UPDATE device_sessions
         SET
           last_update = GREATEST(COALESCE(last_update, $2::timestamptz), $2::timestamptz),
           data_points_count = COALESCE(data_points_count, 0) + 1,
           uptime = CASE
             WHEN status = 'running' THEN GREATEST(
               COALESCE(uptime, 0),
               EXTRACT(EPOCH FROM ($2::timestamptz - COALESCE(server_session_start, created_at)))::int,
               0
             )
             ELSE uptime
           END,
           avg_imu_accel_delta_mps2 = CASE
             WHEN $3::numeric IS NULL THEN avg_imu_accel_delta_mps2
             WHEN avg_imu_accel_delta_mps2 IS NULL THEN $3::numeric
             ELSE ROUND(((avg_imu_accel_delta_mps2 + $3::numeric) / 2)::numeric, 3)
           END,
           avg_vehicle_battery = CASE
             WHEN $4::numeric IS NULL THEN avg_vehicle_battery
             WHEN avg_vehicle_battery IS NULL THEN $4::numeric
             ELSE ROUND(((avg_vehicle_battery + $4::numeric) / 2)::numeric, 2)
           END,
           avg_device_battery = CASE
             WHEN $5::numeric IS NULL THEN avg_device_battery
             WHEN avg_device_battery IS NULL THEN $5::numeric
             ELSE ROUND(((avg_device_battery + $5::numeric) / 2)::numeric, 2)
           END,
           last_latitude = COALESCE($6, last_latitude),
           last_longitude = COALESCE($7, last_longitude),
           last_speed = COALESCE($8, last_speed),
           updated_at = NOW()
         WHERE id = $1 AND device_id = $9 AND ${sessionStatusPredicate}
         RETURNING id`,
        [
          params.sessionId,
          serverOccurredAt,
          params.imuAccelDeltaMps2 ?? null,
          params.vehicleBattery ?? null,
          params.deviceBattery ?? null,
          params.latitude ?? null,
          params.longitude ?? null,
          params.speed ?? null,
          params.deviceId,
        ],
      );

      if (touched.rowCount === 0) {
        logger.warn(
          { sessionId: params.sessionId, deviceId: params.deviceId, event: 'touch_device_session_skipped', reason: 'session_not_touchable' },
          'Touch device session skipped',
        );
        return;
      }

      if (!updateDeviceState) {
        return;
      }

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
      logger.error(
        { err: fallbackErr, sessionId: params.sessionId, deviceId: params.deviceId, event: 'touch_device_session_failed' },
        'Touch device session failed',
      );
      throw fallbackErr;
    }
  }
};

export const completeDeviceSession = async (
  deviceId: string,
  deviceTimestampMs: number,
  knownSessionId?: number | null,
  serverTimestampMs?: number,
  completionSource: 'stopped' | 'heartbeat' = 'stopped',
  sessionIdentity: SessionIdentityInput = {},
): Promise<{ sessionId: number | null; discarded: boolean }> => {
  const client = await pool.connect();
  const deviceOccurredAt = toIsoTimestamp(deviceTimestampMs);
  const serverOccurredAt = toIsoTimestamp(serverTimestampMs ?? Date.now());
  const localSessionKey = sessionIdentity.localSessionKey ?? null;
  const firmwareBootId = sessionIdentity.bootId?.trim() || null;
  const boundarySource = sessionIdentity.boundarySource ?? 'firmware';
  const endReason = sessionIdentity.endReason
    ?? (completionSource === 'heartbeat' ? 'heartbeat' : 'ignition_off');

  try {
    await client.query('BEGIN');

    const active = knownSessionId
      ? await client.query<DeviceSessionRow>(
          `SELECT id, status, COALESCE(data_points_count, 0)::text AS data_points_count
           FROM device_sessions
           WHERE id = $1 AND device_id = $2
           LIMIT 1
           FOR UPDATE`,
          [knownSessionId, deviceId],
        )
      : await client.query<DeviceSessionRow>(
          `SELECT id, status, COALESCE(data_points_count, 0)::text AS data_points_count
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
      return { sessionId: null, discarded: false };
    }

    if (session.status && session.status !== 'running') {
      await client.query('COMMIT');
      return { sessionId: session.id, discarded: false };
    }

    let runtimeSeconds = 0;
    const dataPointsCount = toInt(session.data_points_count);

    try {
      await client.query('SAVEPOINT complete_device_session');

      const completed = await client.query<DeviceSessionRow>(
        `UPDATE device_sessions
         SET
           status = 'completed',
           server_session_end = $2,
           session_end = $3,
           local_session_key = COALESCE(local_session_key, $4::bigint),
           firmware_boot_id = COALESCE(firmware_boot_id, $5),
           boundary_source = COALESCE($6, boundary_source),
           end_reason = COALESCE($7, end_reason),
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
        [session.id, serverOccurredAt, deviceOccurredAt, localSessionKey, firmwareBootId, boundarySource, endReason],
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
           local_session_key = COALESCE(local_session_key, $4::bigint),
           firmware_boot_id = COALESCE(firmware_boot_id, $5),
           boundary_source = COALESCE($6, boundary_source),
           end_reason = COALESCE($7, end_reason),
           last_update = $2,
           uptime = GREATEST(
             EXTRACT(EPOCH FROM ($2::timestamptz - COALESCE(server_session_start, created_at)))::int,
             0
           ),
           updated_at = NOW()
         WHERE id = $1
         RETURNING COALESCE(uptime, 0)::text AS runtime_seconds`,
        [session.id, serverOccurredAt, deviceOccurredAt, localSessionKey, firmwareBootId, boundarySource, endReason],
      );

      runtimeSeconds = Number.parseInt(String(completed.rows[0]?.runtime_seconds ?? '0'), 10);
    }

    const shouldDiscardTransientHeartbeatSession =
      completionSource === 'heartbeat' &&
      dataPointsCount <= TRANSIENT_HEARTBEAT_SESSION_MAX_DATA_POINTS &&
      Math.max(runtimeSeconds, 0) <= TRANSIENT_HEARTBEAT_SESSION_MAX_RUNTIME_SECONDS;

    const shouldDiscardTransientAuthoritativeSession =
      completionSource !== 'heartbeat' &&
      dataPointsCount <= TRANSIENT_AUTHORITATIVE_SESSION_MAX_DATA_POINTS;

    if (shouldDiscardTransientHeartbeatSession || shouldDiscardTransientAuthoritativeSession) {
      await client.query('UPDATE event_logs SET session_id = NULL WHERE session_id = $1', [session.id]);
      await client.query('DELETE FROM device_sessions WHERE id = $1', [session.id]);
      await client.query('COMMIT');
      logger.info(
        {
          deviceId,
          sessionId: session.id,
          completionSource,
          dataPointsCount,
          runtimeSeconds: Math.max(runtimeSeconds, 0),
          event: 'device_session_discarded',
          reason: shouldDiscardTransientHeartbeatSession
            ? 'transient_heartbeat'
            : 'transient_authoritative_without_telemetry',
        },
        'Device session discarded',
      );
      return { sessionId: session.id, discarded: true };
    }

    await client.query(
      `UPDATE devices
       SET total_runtime_seconds = COALESCE(total_runtime_seconds, 0) + $2, updated_at = NOW()
       WHERE device_id = $1`,
      [deviceId, Math.max(runtimeSeconds, 0)],
    );

    await client.query('COMMIT');
    return { sessionId: session.id, discarded: false };
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err, deviceId, event: 'complete_device_session_failed' }, 'Complete device session failed');
    throw err;
  } finally {
    client.release();
  }
};

export const findActiveDeviceSessionId = async (deviceId: string): Promise<number | null> => {
  try {
    const result = await pool.query<DeviceSessionRow>(
      `SELECT id
       FROM device_sessions
       WHERE device_id = $1 AND status = 'running'
       ORDER BY created_at DESC
       LIMIT 1`,
      [deviceId],
    );
    return result.rows[0]?.id ?? null;
  } catch (err) {
    logger.error({ err, deviceId, event: 'find_active_device_session_failed' }, 'Find active device session failed');
    return null;
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
    logger.error({ err, deviceId, event: 'sync_active_obd_dtc_alerts_failed' }, 'Sync active OBD DTC alerts failed');
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
    logger.error(
      { err, deviceId, event: 'sync_active_maintenance_alerts_by_title_failed' },
      'Sync active maintenance alerts by title failed',
    );
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
    logger.error(
      { err, deviceId, title: normalizedTitle, event: 'sync_active_maintenance_alerts_by_message_failed' },
      'Sync active maintenance alerts by message failed',
    );
    return new Set<string>();
  }
};
