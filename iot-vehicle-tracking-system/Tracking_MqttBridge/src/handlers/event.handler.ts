import { z } from 'zod';
import { writeDeviceEvent } from '../infrastructure/victorialogs';
import { publishInternalEvent } from '../publishers/internal-event.publisher';
import { logger } from '../infrastructure/logger';

const eventSchema = z.object({
  device_id: z.string().min(1),
  event_type: z.enum(['error', 'warning', 'info']),
  code: z.number().int().optional(),
  message: z.string().optional(),
  timestamp: z.number().positive(),
});

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

  if (payload.device_id !== deviceIdFromTopic) {
    logger.warn(
      { topic: deviceIdFromTopic, payload: payload.device_id },
      'Device ID mismatch in event',
    );
    return;
  }

  // Log to VictoriaLogs
  writeDeviceEvent(
    payload.device_id,
    `device_${payload.event_type}`,
    payload.message ?? `Device ${payload.event_type} (code: ${payload.code ?? 'N/A'})`,
    {
      event_code: payload.code,
      severity: payload.event_type,
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
      timestamp: new Date(payload.timestamp).toISOString(),
    });
  }

  logger.info(
    { deviceId: payload.device_id, eventType: payload.event_type, code: payload.code },
    'Device event processed',
  );
};
