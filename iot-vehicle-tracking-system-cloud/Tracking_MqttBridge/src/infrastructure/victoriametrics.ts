import { victoriaMetricsConfig } from '../config/env';
import { logger } from './logger';
import { pool } from './pool';

const IMPORT_URL = `${victoriaMetricsConfig.url}/api/v1/import/prometheus`;

/**
 * Sanitize a label value to prevent Prometheus label injection.
 * Removes characters that could break the line protocol format.
 */
const sanitizeLabel = (value: string): string => {
  return value.replace(/[^a-zA-Z0-9_\-]/g, '_');
};

/**
 * Write a single metric line to VictoriaMetrics in Prometheus exposition format.
 */
export const writeMetric = async (
  metricName: string,
  labels: Record<string, string>,
  value: number,
  timestampMs: number,
): Promise<void> => {
  const sanitizedLabels = Object.entries(labels)
    .map(([k, v]) => `${sanitizeLabel(k)}="${sanitizeLabel(v)}"`)
    .join(',');

  const line = `${metricName}{${sanitizedLabels}} ${value} ${timestampMs}`;

  try {
    const response = await fetch(IMPORT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: line + '\n',
    });

    if (!response.ok) {
      logger.error(
        {
          metricName,
          status: response.status,
          statusText: response.statusText,
          event: 'victoriametrics_write_rejected',
        },
        'VictoriaMetrics write rejected',
      );
    }
  } catch (err) {
    logger.error({ err, metricName, event: 'victoriametrics_write_failed' }, 'VictoriaMetrics write failed');
  }
};

/**
 * Write multiple metrics for a device telemetry payload.
 */
export const writeDeviceTelemetry = async (
  deviceId: string,
  data: Record<string, number | undefined>,
  timestampMs: number,
  messageId?: string,
): Promise<void> => {
  const sanitizedDeviceId = sanitizeLabel(deviceId);
  const lines: string[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    const metricName = `tracker_telemetry_${sanitizeLabel(key)}`;
    lines.push(`${metricName}{device_id="${sanitizedDeviceId}"} ${value} ${timestampMs}`);
  }

  if (lines.length === 0) return;

  /* Commit a recoverable copy before the MQTT QoS1 packet can be PUBACKed.
   * A duplicate message_id is a no-op, so broker replay never adds a second
   * durable task. The worker can recover after process/VM restarts. */
  const body = lines.join('\n') + '\n';
  await pool.query(
    `INSERT INTO telemetry_metric_outbox (device_id, message_id, line_payload, occurred_at)
     VALUES ($1, $2, $3, to_timestamp($4::double precision / 1000))
     ON CONFLICT (device_id, message_id) DO NOTHING`,
    [deviceId, messageId ?? null, body, timestampMs],
  );

  try {
    const response = await fetch(IMPORT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body,
    });

    if (!response.ok) {
      throw new Error(`VictoriaMetrics rejected telemetry import status=${response.status}`);
    }
    /* Keep the row on SQL failure: repeated delivery is safe under 1ms VM dedup. */
    if (messageId) {
      await pool.query(
        'DELETE FROM telemetry_metric_outbox WHERE device_id = $1 AND message_id = $2',
        [deviceId, messageId],
      );
    } else {
      await pool.query(
        'DELETE FROM telemetry_metric_outbox WHERE device_id = $1 AND message_id IS NULL AND line_payload = $2',
        [deviceId, body],
      );
    }
  } catch (err) {
    logger.error(
      { err, deviceId, lineCount: lines.length, event: 'victoriametrics_batch_write_failed' },
      'VictoriaMetrics batch write failed; MQTT QoS1 must not acknowledge this telemetry',
    );
    throw err;
  }
};


/**
 * Drain committed telemetry metric writes following VM outages or bridge crashes.
 * Transactions row-lock with SKIP LOCKED so multiple replicas cannot claim the
 * same batch. HTTP failures roll back; the SQL rows are never silently dropped.
 */
export const flushTelemetryMetricOutbox = async (): Promise<number> => {
  const client = await pool.connect();
  let ids: string[] = [];
  try {
    await client.query('BEGIN');
    const pending = await client.query<{ id: string; line_payload: string }>(
      `SELECT id, line_payload FROM telemetry_metric_outbox
       WHERE next_attempt_at <= now() ORDER BY id ASC LIMIT 64
       FOR UPDATE SKIP LOCKED`,
    );
    ids = pending.rows.map((row) => row.id);
    if (ids.length === 0) {
      await client.query('COMMIT');
      return 0;
    }
    const response = await fetch(IMPORT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: pending.rows.map((row) => row.line_payload).join(''),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`VM outbox recovery status=${response.status}`);
    await client.query('DELETE FROM telemetry_metric_outbox WHERE id = ANY($1::bigint[])', [ids]);
    await client.query('COMMIT');
    return ids.length;
  } catch (err) {
    await client.query('ROLLBACK');
    // Retry with bounded delay, including long-lived VM outages.  Rows remain
    // queryable and recoverable even when retries exceed the normal window.
    if (ids.length > 0) {
      await pool.query(
        `UPDATE telemetry_metric_outbox SET attempts = attempts + 1,
           next_attempt_at = now() + interval '10 seconds'
         WHERE id = ANY($1::bigint[])`, [ids],
      ).catch((updateErr) => {
        logger.error({ err: updateErr, event: 'telemetry_outbox_backoff_failed' }, 'Outbox retry schedule failed');
      });
    }
    throw err;
  } finally {
    client.release();
  }
};

let outboxTimer: NodeJS.Timeout | undefined;
let drainInFlight: Promise<void> | undefined;

const drainTick = (): void => {
  if (drainInFlight) return;
  drainInFlight = flushTelemetryMetricOutbox()
    .then((count) => {
      if (count) logger.info({ count, event: 'telemetry_outbox_recovered' }, 'Recovered historical telemetry');
    })
    .catch((err) => {
      logger.warn({ err, event: 'telemetry_outbox_retry_pending' }, 'Telemetry recovery deferred');
    })
    .finally(() => { drainInFlight = undefined; });
};

export const startTelemetryMetricOutbox = (): void => {
  if (outboxTimer) return;
  outboxTimer = setInterval(drainTick, 2000);
  outboxTimer.unref();
  drainTick();
};

export const stopTelemetryMetricOutbox = async (): Promise<void> => {
  if (outboxTimer) clearInterval(outboxTimer);
  outboxTimer = undefined;
  if (drainInFlight) await drainInFlight;
};
