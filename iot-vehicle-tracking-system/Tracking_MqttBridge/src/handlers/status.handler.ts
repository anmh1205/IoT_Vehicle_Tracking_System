import { statusSchema } from '../validators/payload.validator';
import { updateDeviceStatus } from '../infrastructure/database';
import { verifyDeviceToken } from '../services/device-auth.service';
import { writeDeviceEvent } from '../infrastructure/victorialogs';
import { publishInternalEvent } from '../publishers/internal-event.publisher';
import { getStatus, setStatus, getOrCreateSession, clearSession } from '../cache/device-state.cache';
import { logger } from '../infrastructure/logger';

/**
 * Handle device status changes on topic v1/{deviceId}/status.
 *
 * Transitions:
 * - running  -> Create or continue session, publish session event
 * - stopped  -> End current session, publish session event
 */
export const handleStatus = async (
  deviceIdFromTopic: string,
  message: Buffer,
): Promise<void> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(message.toString());
  } catch {
    logger.warn(`Invalid JSON status from device ${deviceIdFromTopic}`);
    return;
  }

  const result = statusSchema.safeParse(parsed);
  if (!result.success) {
    logger.warn(
      { deviceId: deviceIdFromTopic, issues: result.error.issues },
      'Invalid status payload',
    );
    return;
  }

  const payload = result.data;

  if (payload.device_id !== deviceIdFromTopic) {
    logger.warn(
      `Device ID mismatch: topic=${deviceIdFromTopic}, payload=${payload.device_id}`,
    );
    return;
  }

  const device = await verifyDeviceToken(payload.device_id, payload.auth_token);
  if (!device) {
    logger.warn(`Auth failed for device ${payload.device_id}`);
    return;
  }

  const previousState = getStatus(payload.device_id);
  const previousStatus = previousState?.status ?? 'offline';

  if (payload.status === 'running') {
    const [sessionId, isNewSession] = getOrCreateSession(payload.device_id);
    setStatus(payload.device_id, 'running', sessionId);

    await updateDeviceStatus(payload.device_id, 'running');

    if (isNewSession) {
      publishInternalEvent('session', {
        device_id: payload.device_id,
        session_id: sessionId,
        action: 'started',
        timestamp: new Date(payload.timestamp).toISOString(),
      });
    }

    writeDeviceEvent(
      payload.device_id,
      'status_change',
      `Device status: ${previousStatus} -> running`,
      { session_id: sessionId, previous_status: previousStatus },
    ).catch((err) => {
      logger.error(`VictoriaLogs write failed for status change`, err);
    });

    logger.info(
      `Device ${payload.device_id}: ${previousStatus} -> running (session=${sessionId})`,
    );
  } else if (payload.status === 'stopped') {
    const endedSessionId = clearSession(payload.device_id);
    setStatus(payload.device_id, 'stopped');

    await updateDeviceStatus(payload.device_id, 'stopped');

    if (endedSessionId) {
      publishInternalEvent('session', {
        device_id: payload.device_id,
        session_id: endedSessionId,
        action: 'ended',
        timestamp: new Date(payload.timestamp).toISOString(),
      });
    }

    writeDeviceEvent(
      payload.device_id,
      'status_change',
      `Device status: ${previousStatus} -> stopped`,
      { session_id: endedSessionId, previous_status: previousStatus },
    ).catch((err) => {
      logger.error(`VictoriaLogs write failed for status change`, err);
    });

    logger.info(
      `Device ${payload.device_id}: ${previousStatus} -> stopped (session=${endedSessionId} ended)`,
    );
  }

  // Publish status change internal event
  publishInternalEvent('status', {
    device_id: payload.device_id,
    previous_status: previousStatus,
    current_status: payload.status,
  });
};
