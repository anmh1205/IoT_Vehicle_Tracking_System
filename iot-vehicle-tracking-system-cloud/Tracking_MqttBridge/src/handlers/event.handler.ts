import { writeDeviceEvent } from '../infrastructure/victorialogs';
import { publishInternalEvent } from '../publishers/internal-event.publisher';
import { logger } from '../infrastructure/logger';
import { verifyDeviceToken } from '../services/device-auth.service';
import { eventSchema } from '../validators/payload.validator';
import { normalizePayloadTimestamp } from '../utils/timestamp.util';

/**
 * Handle device events (errors, warnings) on topic v1/{deviceId}/events.
 *
 * Processing:
 * 1. Parse and validate payload
 * 2. Log to VictoriaLogs
 * 3. Publish critical events to internal topic for Backend
 */
export const handleEvent = async (
  deviceIdFromTopic: string,
  message: Buffer,
): Promise<void> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(message.toString());
  } catch {
    logger.warn({ deviceId: deviceIdFromTopic }, 'Invalid JSON event payload');
    return;
  }

  const result = eventSchema.safeParse(parsed);
  if (!result.success) {
    logger.warn(
      { deviceId: deviceIdFromTopic, issues: result.error.issues },
      'Invalid event payload',
    );
    return;
  }

  const payload = result.data;
  const messageId = payload.metadata?.message_id;
  const schemaVersion = payload.metadata?.schema_version;
  const seqNo = payload.metadata?.seq_no;
  const bootId = payload.metadata?.boot_id;
  const { timestampMs, source: timestampSource } = normalizePayloadTimestamp(
    payload.timestamp,
    payload.metadata?.sent_at,
  );

  if (payload.device_id !== deviceIdFromTopic) {
    logger.warn(
      { topic: deviceIdFromTopic, payload: payload.device_id },
      'Device ID mismatch in event',
    );
    return;
  }

  const device = await verifyDeviceToken(payload.device_id, payload.auth_token);
  if (!device) {
    logger.warn(`Auth failed for device ${payload.device_id}`);
    return;
  }

  if (timestampSource !== 'payload') {
    logger.warn(
      {
        deviceId: payload.device_id,
        payloadTimestamp: payload.timestamp,
        metadataSentAt: payload.metadata?.sent_at,
        normalizedTimestampMs: timestampMs,
        timestampSource,
      },
      'Normalized invalid event timestamp before publishing alerts',
    );
  }

  // Log to VictoriaLogs
  writeDeviceEvent(
    payload.device_id,
    `device_${payload.event_type}`,
    payload.message ?? `Device ${payload.event_type} (code: ${payload.code ?? 'N/A'})`,
    {
      event_code: payload.code,
      severity: payload.event_type,
      message_id: messageId,
      schema_version: schemaVersion,
      seq_no: seqNo,
      boot_id: bootId,
    },
  ).catch((err) => {
    logger.error({ err, deviceId: payload.device_id }, 'VictoriaLogs write failed for device event');
  });

  // Publish error/warning events as alerts for Backend consumption
  if (payload.event_type === 'error' || payload.event_type === 'warning') {
    publishInternalEvent('alert', {
      device_id: payload.device_id,
      alert_type: `device_${payload.event_type}`,
      code: payload.code,
      message: payload.message,
      message_id: messageId,
      schema_version: schemaVersion,
      seq_no: seqNo,
      boot_id: bootId,
      timestamp: new Date(timestampMs).toISOString(),
    });
  }

  logger.info(
    { deviceId: payload.device_id, eventType: payload.event_type, code: payload.code },
    'Device event processed',
  );
};
