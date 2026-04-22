import { pool } from '../infrastructure/database';
import { logger } from '../infrastructure/logger';
import type { RuntimeStateSnapshot } from '../types/device-state.types';

interface DeviceUpdate {
  deviceId: string;
  status: string;
  latitude?: number;
  longitude?: number;
  speed?: number;
  sessionId?: number;
  serverTimestamp: number;
  runtimeState?: RuntimeStateSnapshot | null;
}

const MAX_BUFFER_SIZE = 100;
const FLUSH_INTERVAL_MS = 1000;
const MAX_CONSECUTIVE_FAILURES = 3;

let buffer: DeviceUpdate[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let consecutiveFailures = 0;
let isCircuitOpen = false;

/**
 * Add an update to the batch buffer.
 * If the circuit breaker is open, data is dropped to prevent OOM.
 */
export const addUpdate = (update: DeviceUpdate): void => {
  if (isCircuitOpen) {
    logger.warn(`Circuit breaker OPEN: dropping update for ${update.deviceId}`);
    return;
  }

  buffer.push(update);

  if (buffer.length >= MAX_BUFFER_SIZE) {
    flush();
  }
};

/**
 * Flush buffered updates to PostgreSQL in a single batch.
 */
const flush = async (): Promise<void> => {
  if (buffer.length === 0) return;

  const batch = buffer.splice(0, buffer.length);

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const update of batch) {
        await client.query(
          `UPDATE devices
           SET current_status = CASE
                 WHEN $7::bigint IS NULL THEN $2
                 WHEN EXISTS (
                   SELECT 1
                   FROM device_sessions s
                   WHERE s.id = $7 AND s.status = 'running'
               ) THEN $2
                 ELSE current_status
               END,
               ignition_state = COALESCE($8, ignition_state),
               motion_state = COALESCE($9, motion_state),
               vehicle_state = COALESCE($10, vehicle_state),
               device_state = COALESCE($11, device_state),
               sleep_mode = COALESCE($12, sleep_mode),
               state_updated_at = CASE
                 WHEN $8::text IS NOT NULL
                   OR $9::text IS NOT NULL
                   OR $10::text IS NOT NULL
                   OR $11::text IS NOT NULL
                   OR $12::text IS NOT NULL
                 THEN GREATEST(
                   COALESCE(state_updated_at, to_timestamp($6 / 1000.0)),
                   to_timestamp($6 / 1000.0)
                 )
                 ELSE state_updated_at
               END,
               last_latitude = COALESCE($3, last_latitude),
               last_longitude = COALESCE($4, last_longitude),
               last_speed = COALESCE($5, last_speed),
               last_seen_at = GREATEST(
                 COALESCE(last_seen_at, to_timestamp($6 / 1000.0)),
                 to_timestamp($6 / 1000.0)
               )
           WHERE device_id = $1`,
          [
            update.deviceId,
            update.status,
            update.latitude ?? null,
            update.longitude ?? null,
            update.speed ?? null,
            update.serverTimestamp,
            update.sessionId ?? null,
            update.runtimeState?.ignition_state ?? null,
            update.runtimeState?.motion_state ?? null,
            update.runtimeState?.vehicle_state ?? null,
            update.runtimeState?.device_state ?? null,
            update.runtimeState?.sleep_mode ?? null,
          ],
        );

        if (update.sessionId) {
          await client.query(
            `UPDATE device_sessions
             SET last_latitude = COALESCE($2, last_latitude),
                 last_longitude = COALESCE($3, last_longitude),
                 last_speed = COALESCE($4, last_speed),
                 updated_at = NOW()
             WHERE id = $1`,
            [
              update.sessionId,
              update.latitude ?? null,
              update.longitude ?? null,
              update.speed ?? null,
            ],
          );
        }
      }

      await client.query('COMMIT');

      consecutiveFailures = 0;
      if (isCircuitOpen) {
        isCircuitOpen = false;
        logger.info('Circuit breaker CLOSED: database writes resumed');
      }
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    consecutiveFailures += 1;
    logger.error(
      { err, failures: consecutiveFailures, max: MAX_CONSECUTIVE_FAILURES },
      'Batch write failed',
    );

    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      isCircuitOpen = true;
      logger.error(
        'Circuit breaker OPEN: dropping data to prevent OOM. ' +
        'Check PostgreSQL connectivity.',
      );
    }
  }
};

/**
 * Start the periodic flush timer.
 */
export const startBatchWriter = (): void => {
  if (flushTimer) return;

  flushTimer = setInterval(() => {
    flush().catch((err) => {
      logger.error('Scheduled flush error', err);
    });
  }, FLUSH_INTERVAL_MS);

  logger.info(
    `Batch writer started (interval=${FLUSH_INTERVAL_MS}ms, maxBuffer=${MAX_BUFFER_SIZE})`,
  );
};

/**
 * Stop the batch writer and flush remaining data.
 */
export const stopBatchWriter = async (): Promise<void> => {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }

  await flush();
  logger.info('Batch writer stopped, remaining data flushed');
};
