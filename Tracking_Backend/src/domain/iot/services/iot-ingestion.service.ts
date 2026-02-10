import { randomUUID } from 'node:crypto';
import { pool } from '@/infrastructure/database/pool';
import { createNotFoundError, createUnauthorizedError } from '@/shared/utils/errors.util';
import type { QueryResultRow } from 'pg';

interface DeviceRow extends QueryResultRow {
  id: number;
  device_id: string;
  auth_token: string;
}

interface SessionRow extends QueryResultRow {
  id: number;
}

export interface IotPayload {
  deviceId: string;
  authToken: string;
  timestamp?: number;
  data: {
    lat?: number;
    lon?: number;
    spd?: number;
    vib?: number;
    batt?: number;
    err?: number;
    [key: string]: unknown;
  };
}

export const ingestDeviceData = async (payload: IotPayload) => {
  const correlationId = randomUUID();
  const deviceTimestamp = payload.timestamp ? new Date(payload.timestamp) : new Date();
  const serverTimestamp = new Date();

  const deviceResult = await pool.query<DeviceRow>(
    'SELECT id, device_id, auth_token FROM devices WHERE device_id = $1 LIMIT 1',
    [payload.deviceId],
  );
  const device = deviceResult.rows[0];
  if (!device) {
    throw createNotFoundError('Device not found');
  }

  if (device.auth_token !== payload.authToken) {
    throw createUnauthorizedError('Invalid device auth token');
  }

  await pool.query(
    `UPDATE devices
     SET
       last_seen_at = $2,
       current_status = 'running',
       latitude = COALESCE($3, latitude),
       longitude = COALESCE($4, longitude),
       last_error_code = COALESCE($5, last_error_code),
       updated_at = NOW()
     WHERE device_id = $1`,
    [
      payload.deviceId,
      serverTimestamp.toISOString(),
      payload.data.lat ?? null,
      payload.data.lon ?? null,
      payload.data.err ?? null,
    ],
  );

  const activeSessionResult = await pool.query<SessionRow>(
    `SELECT id
     FROM device_sessions
     WHERE device_id = $1 AND status = 'running'
     ORDER BY created_at DESC
     LIMIT 1`,
    [payload.deviceId],
  );

  let sessionId = activeSessionResult.rows[0]?.id;
  if (!sessionId) {
    const createdSession = await pool.query<SessionRow>(
      `INSERT INTO device_sessions (
          device_id,
          status,
          server_session_start,
          session_start,
          data_points_count,
          last_update,
          start_correlation_id
       )
       VALUES ($1, 'running', $2, $3, 0, $2, $4)
       RETURNING id`,
      [
        payload.deviceId,
        serverTimestamp.toISOString(),
        deviceTimestamp.toISOString(),
        correlationId,
      ],
    );
    sessionId = createdSession.rows[0].id;
  }

  await pool.query(
    `UPDATE device_sessions
     SET
       data_points_count = data_points_count + 1,
       last_update = $2,
       avg_vibration = CASE
         WHEN $3 IS NULL THEN avg_vibration
         WHEN avg_vibration IS NULL THEN $3
         ELSE (avg_vibration + $3) / 2
       END,
       updated_at = NOW()
     WHERE id = $1`,
    [sessionId, serverTimestamp.toISOString(), payload.data.vib ?? null],
  );

  await pool.query(
    `INSERT INTO event_logs (
      correlation_id,
      device_id,
      session_id,
      event_type,
      event_code,
      severity,
      context,
      metadata,
      message,
      device_timestamp,
      server_timestamp,
      error_code
    )
    VALUES ($1, $2, $3, 'connection', 'iot_data', 'info', $4, $5, $6, $7, $8, $9)`,
    [
      correlationId,
      payload.deviceId,
      sessionId,
      JSON.stringify(payload.data),
      JSON.stringify({ source: 'api/iot/data' }),
      'Telemetry ingested',
      deviceTimestamp.toISOString(),
      serverTimestamp.toISOString(),
      payload.data.err ?? null,
    ],
  );

  return {
    accepted: true,
    correlationId,
    sessionId,
    receivedAt: serverTimestamp.toISOString(),
  };
};
