import { pool } from '../infrastructure/database';
import { logger } from '../infrastructure/logger';
import { createRetryableBatchQueue } from './retryable-batch-queue';
import type { RuntimeStateSnapshot } from '../types/device-state.types';

interface DeviceUpdate {
  deviceId: string;
  status: string;
  latitude?: number;
  longitude?: number;
  speed?: number;
  sessionId?: number;
  serverTimestamp: number;
  payloadTimestamp: number;
  runtimeState?: RuntimeStateSnapshot | null;
}

const MAX_BUFFER_SIZE = 100;
const MAX_PENDING_UPDATES = 1000;
const FLUSH_INTERVAL_MS = 1000;

let flushTimer: ReturnType<typeof setInterval> | null = null;

/**
 * One transaction represents one batch. The retry queue owns the batch until
 * COMMIT succeeds; failed database writes are never silently discarded.
 */
const persistBatch = async (batch: readonly DeviceUpdate[]): Promise<void> => {
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const update of batch) {
        await client.query(
          `UPDATE devices
           SET current_status = CASE
                 WHEN (
                 to_timestamp($6 / 1000.0) >= COALESCE(last_seen_at, '-infinity'::timestamptz)
                 AND (
                   $7::bigint IS NULL
                   OR EXISTS (
                     SELECT 1
                     FROM device_sessions s
                     WHERE s.id = $7 AND s.status = 'running'
                   )
                 )
               ) THEN $2
                 ELSE current_status
               END,
               ignition_state = CASE
                 WHEN (
                 to_timestamp($6 / 1000.0) >= COALESCE(last_seen_at, '-infinity'::timestamptz)
                 AND (
                   $7::bigint IS NULL
                   OR EXISTS (
                     SELECT 1
                     FROM device_sessions s
                     WHERE s.id = $7 AND s.status = 'running'
                   )
                 )
               ) THEN COALESCE($8, ignition_state)
                 ELSE ignition_state
               END,
               motion_state = CASE
                 WHEN (
                 to_timestamp($6 / 1000.0) >= COALESCE(last_seen_at, '-infinity'::timestamptz)
                 AND (
                   $7::bigint IS NULL
                   OR EXISTS (
                     SELECT 1
                     FROM device_sessions s
                     WHERE s.id = $7 AND s.status = 'running'
                   )
                 )
               ) THEN COALESCE($9, motion_state)
                 ELSE motion_state
               END,
               vehicle_state = CASE
                 WHEN (
                 to_timestamp($6 / 1000.0) >= COALESCE(last_seen_at, '-infinity'::timestamptz)
                 AND (
                   $7::bigint IS NULL
                   OR EXISTS (
                     SELECT 1
                     FROM device_sessions s
                     WHERE s.id = $7 AND s.status = 'running'
                   )
                 )
               ) THEN COALESCE($10, vehicle_state)
                 ELSE vehicle_state
               END,
               device_state = CASE
                 WHEN (
                 to_timestamp($6 / 1000.0) >= COALESCE(last_seen_at, '-infinity'::timestamptz)
                 AND (
                   $7::bigint IS NULL
                   OR EXISTS (
                     SELECT 1
                     FROM device_sessions s
                     WHERE s.id = $7 AND s.status = 'running'
                   )
                 )
               ) THEN COALESCE($11, device_state)
                 ELSE device_state
               END,
               sleep_mode = CASE
                 WHEN (
                 to_timestamp($6 / 1000.0) >= COALESCE(last_seen_at, '-infinity'::timestamptz)
                 AND (
                   $7::bigint IS NULL
                   OR EXISTS (
                     SELECT 1
                     FROM device_sessions s
                     WHERE s.id = $7 AND s.status = 'running'
                   )
                 )
               ) THEN COALESCE($12, sleep_mode)
                 ELSE sleep_mode
               END,
               state_updated_at = CASE
                 WHEN (
                 to_timestamp($6 / 1000.0) >= COALESCE(last_seen_at, '-infinity'::timestamptz)
                 AND (
                   $7::bigint IS NULL
                   OR EXISTS (
                     SELECT 1
                     FROM device_sessions s
                     WHERE s.id = $7 AND s.status = 'running'
                   )
                 )
               )
                  AND (
                    $8::text IS NOT NULL
                    OR $9::text IS NOT NULL
                    OR $10::text IS NOT NULL
                    OR $11::text IS NOT NULL
                    OR $12::text IS NOT NULL
                  )
                 THEN GREATEST(
                   COALESCE(state_updated_at, to_timestamp($6 / 1000.0)),
                   to_timestamp($6 / 1000.0)
                 )
                 ELSE state_updated_at
               END,
               last_latitude = CASE
                 WHEN (
                 to_timestamp($6 / 1000.0) >= COALESCE(last_seen_at, '-infinity'::timestamptz)
                 AND (
                   $7::bigint IS NULL
                   OR EXISTS (
                     SELECT 1
                     FROM device_sessions s
                     WHERE s.id = $7 AND s.status = 'running'
                   )
                 )
               ) THEN COALESCE($3, last_latitude)
                 ELSE last_latitude
               END,
               last_longitude = CASE
                 WHEN (
                 to_timestamp($6 / 1000.0) >= COALESCE(last_seen_at, '-infinity'::timestamptz)
                 AND (
                   $7::bigint IS NULL
                   OR EXISTS (
                     SELECT 1
                     FROM device_sessions s
                     WHERE s.id = $7 AND s.status = 'running'
                   )
                 )
               ) THEN COALESCE($4, last_longitude)
                 ELSE last_longitude
               END,
               last_speed = CASE
                 WHEN (
                 to_timestamp($6 / 1000.0) >= COALESCE(last_seen_at, '-infinity'::timestamptz)
                 AND (
                   $7::bigint IS NULL
                   OR EXISTS (
                     SELECT 1
                     FROM device_sessions s
                     WHERE s.id = $7 AND s.status = 'running'
                   )
                 )
               ) THEN COALESCE($5, last_speed)
                 ELSE last_speed
               END,
               last_seen_at = GREATEST(
                 COALESCE(last_seen_at, to_timestamp($6 / 1000.0)),
                 to_timestamp($6 / 1000.0)
               ),
               payload_updated_at = CASE
                 WHEN (
                   to_timestamp($6 / 1000.0) >= COALESCE(last_seen_at, '-infinity'::timestamptz)
                   AND (
                     $7::bigint IS NULL
                     OR EXISTS (
                       SELECT 1
                       FROM device_sessions s
                       WHERE s.id = $7 AND s.status = 'running'
                     )
                   )
                 )
                 THEN GREATEST(
                   COALESCE(payload_updated_at, to_timestamp($13 / 1000.0)),
                   to_timestamp($13 / 1000.0)
                 )
                 ELSE payload_updated_at
               END
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
            update.payloadTimestamp,
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

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    throw err;
  }
};

const batchQueue = createRetryableBatchQueue<DeviceUpdate>({
  capacity: MAX_PENDING_UPDATES,
  batchSize: MAX_BUFFER_SIZE,
  writeBatch: persistBatch,
  onDropped: (update) => {
    logger.error(
      { deviceId: update.deviceId, pendingLimit: MAX_PENDING_UPDATES,
        event: 'batch_write_dropped', reason: 'memory_limit_exceeded' },
      'Dropped live-state snapshot after prolonged database failure',
    );
  },
  onFailure: (error, failures, retryMs) => {
    logger.error(
      { err: error, failures, retryMs, pending: batchQueue.pendingCount(),
        event: 'batch_write_failed' },
      'PostgreSQL batch failed; retained in memory for retry',
    );
  },
  onRecovered: (previousFailures) => {
    logger.info(
      { previousFailures, event: 'batch_writer_recovered' },
      'PostgreSQL batch writer recovered after retry',
    );
  },
});

export const addUpdate = (update: DeviceUpdate): void => {
  batchQueue.enqueue(update);
  if (batchQueue.pendingCount() >= MAX_BUFFER_SIZE) {
    void batchQueue.flush();
  }
};

const flush = async (): Promise<void> => {
  await batchQueue.flush();
};

/**
 * Start the periodic flush timer.
 */
export const startBatchWriter = (): void => {
  if (flushTimer) return;

  flushTimer = setInterval(() => {
    flush().catch((err) => {
      logger.error({ err, event: 'batch_writer_scheduled_flush_failed' }, 'Scheduled batch flush failed');
    });
  }, FLUSH_INTERVAL_MS);

  logger.info(
    { intervalMs: FLUSH_INTERVAL_MS, maxBufferSize: MAX_BUFFER_SIZE, event: 'batch_writer_started' },
    'Batch writer started',
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

  // Wait for any active commit; then attempt every remaining bounded batch.
  // A failed commit is explicit: a volatile queue cannot promise durability.
  while (batchQueue.pendingCount() > 0) {
    const accepted = await batchQueue.flush(true);
    if (!accepted) {
      throw new Error('MQTT Bridge stopped with uncommitted device updates in memory');
    }
  }
  logger.info({ event: 'batch_writer_stopped' }, 'Batch writer stopped');
};
