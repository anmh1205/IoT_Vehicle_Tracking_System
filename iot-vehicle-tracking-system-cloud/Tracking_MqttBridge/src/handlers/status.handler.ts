import { statusSchema } from '../validators/payload.validator';
import {
  completeDeviceSession,
  ensureDeviceSession,
  updateDeviceStatus,
} from '../infrastructure/database';
import { verifyDeviceToken } from '../services/device-auth.service';
import { writeDeviceEvent } from '../infrastructure/victorialogs';
import { publishInternalEvent } from '../publishers/internal-event.publisher';
import { clearSession, getStatus, setStatus } from '../cache/device-state.cache';
import { logger } from '../infrastructure/logger';
import { normalizePayloadTimestamp } from '../utils/timestamp.util';

/**
 * Handle device status changes on topic v1/{deviceId}/status.
 *
 * Transitions:
 * - running  -> Create or continue session, publish session event
 * - stopped  -> End current session, publish session event
 * - heartbeat -> Keepalive while parked, normalized to stopped
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
  const receivedAtMs = Date.now();
  const messageId = payload.metadata?.message_id;
  const schemaVersion = payload.metadata?.schema_version;
  const seqNo = payload.metadata?.seq_no;
  const bootId = payload.metadata?.boot_id;

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
  const reportedStatus = payload.status;
  const normalizedStatus = reportedStatus === 'heartbeat' ? 'stopped' : reportedStatus;
  const { timestampMs, source: timestampSource } = normalizePayloadTimestamp(
    payload.timestamp,
    payload.metadata?.sent_at,
  );

  if (timestampSource !== 'payload') {
    logger.warn(
      {
        deviceId: payload.device_id,
        payloadTimestamp: payload.timestamp,
        metadataSentAt: payload.metadata?.sent_at,
        normalizedTimestampMs: timestampMs,
        timestampSource,
      },
      'Normalized invalid status timestamp before publishing realtime events',
    );
  }

  if (normalizedStatus === 'running') {
    const ensuredSession = await ensureDeviceSession(
      payload.device_id,
      timestampMs,
      receivedAtMs,
    );
    const sessionId = ensuredSession.sessionId;
    const isNewSession = ensuredSession.isNew;
    setStatus(payload.device_id, 'running', sessionId);

    await updateDeviceStatus(payload.device_id, 'running', receivedAtMs);

    if (isNewSession) {
      publishInternalEvent('session', {
        device_id: payload.device_id,
        session_id: sessionId,
        action: 'started',
        message_id: messageId,
        schema_version: schemaVersion,
        seq_no: seqNo,
        boot_id: bootId,
        timestamp: new Date(timestampMs).toISOString(),
      });
    }

    writeDeviceEvent(
      payload.device_id,
      'status_change',
      `Device status: ${previousStatus} -> running`,
      {
        session_id: sessionId,
        previous_status: previousStatus,
        reported_status: reportedStatus,
        message_id: messageId,
        schema_version: schemaVersion,
        seq_no: seqNo,
        boot_id: bootId,
      },
    ).catch((err) => {
      logger.error(`VictoriaLogs write failed for status change`, err);
    });

    logger.info(
      `Device ${payload.device_id}: ${previousStatus} -> running (session=${sessionId})`,
    );
  } else if (normalizedStatus === 'stopped') {
    const completedSession = await completeDeviceSession(
      payload.device_id,
      timestampMs,
      previousState?.sessionId,
      receivedAtMs,
      reportedStatus === 'heartbeat' ? 'heartbeat' : 'stopped',
    );
    const endedSessionId = completedSession.sessionId;
    clearSession(payload.device_id);
    setStatus(payload.device_id, 'stopped', null);

    await updateDeviceStatus(payload.device_id, 'stopped', receivedAtMs);

    if (endedSessionId && !completedSession.discarded) {
      publishInternalEvent('session', {
        device_id: payload.device_id,
        session_id: endedSessionId,
        action: 'ended',
        message_id: messageId,
        schema_version: schemaVersion,
        seq_no: seqNo,
        boot_id: bootId,
        timestamp: new Date(timestampMs).toISOString(),
      });
    }

    writeDeviceEvent(
      payload.device_id,
      'status_change',
      `Device status: ${previousStatus} -> stopped`,
      {
        session_id: endedSessionId,
        previous_status: previousStatus,
        reported_status: reportedStatus,
        message_id: messageId,
        schema_version: schemaVersion,
        seq_no: seqNo,
        boot_id: bootId,
      },
    ).catch((err) => {
      logger.error(`VictoriaLogs write failed for status change`, err);
    });

    logger.info(
      reportedStatus === 'heartbeat'
        ? completedSession.discarded
          ? `Device ${payload.device_id}: heartbeat keepalive discarded transient session=${endedSessionId}`
          : `Device ${payload.device_id}: heartbeat keepalive handled as stopped (session=${endedSessionId} ended)`
        : `Device ${payload.device_id}: ${previousStatus} -> stopped (session=${endedSessionId} ended)`,
    );
  }

  // Publish status change internal event
  publishInternalEvent('status', {
    device_id: payload.device_id,
    previous_status: previousStatus,
    current_status: normalizedStatus,
    reported_status: reportedStatus,
    message_id: messageId,
    schema_version: schemaVersion,
    seq_no: seqNo,
    boot_id: bootId,
  });
};
