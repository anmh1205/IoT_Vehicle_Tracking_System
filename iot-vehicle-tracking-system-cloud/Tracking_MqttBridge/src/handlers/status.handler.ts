import type { StatusPayload } from '../types/payload.types';
import { statusSchema } from '../validators/payload.validator';
import {
  completeDeviceSession,
  ensureDeviceSession,
  findDeviceSessionIdByIdentity,
  updateDeviceStatus,
} from '../infrastructure/database';
import { verifyDeviceToken } from '../services/device-auth.service';
import { writeDeviceEvent } from '../infrastructure/victorialogs';
import { publishInternalEvent } from '../publishers/internal-event.publisher';
import { publishToDevice } from '../mqtt/client';
import {
  clearSession,
  getStatus,
  resolveSessionId,
  setStatus,
} from '../cache/device-state.cache';
import { logger } from '../infrastructure/logger';
import { normalizePayloadTimestamp } from '../utils/timestamp.util';
import { resolveLocalSessionKey } from '../utils/session-identity.util';
import { normalizeRuntimeState } from '../types/device-state.types';

const toCachedStatus = (status: StatusPayload['status']): 'running' | 'stopped' | 'online' => {
  return status === 'heartbeat' ? 'online' : status;
};

const SESSION_FALLBACK_BOUNDARY_SOURCE = 'bridge_fallback';

const publishAssignSession = (params: {
  deviceId: string;
  localSessionKey?: number;
  canonicalSessionId: string;
  bootId?: string;
}): void => {
  if (!params.localSessionKey || !params.bootId) {
    logger.warn(
      {
        deviceId: params.deviceId,
        localSessionKey: params.localSessionKey,
        bootId: params.bootId,
        canonicalSessionId: params.canonicalSessionId,
        event: 'assign_session_skipped',
        reason: 'incomplete_identity',
      },
      'Assign session skipped',
    );
    return;
  }

  publishToDevice(params.deviceId, 'commands', {
    command: 'assign_session',
    params: {
      local_session_key: params.localSessionKey,
      canonical_session_id: params.canonicalSessionId,
      boot_id: params.bootId,
    },
  });
};

export const handleStatus = async (
  deviceIdFromTopic: string,
  message: Buffer,
): Promise<void> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(message.toString());
  } catch {
    logger.warn({ deviceId: deviceIdFromTopic, event: 'status_payload_invalid_json' }, 'Invalid status payload');
    return;
  }

  const result = statusSchema.safeParse(parsed);
  if (!result.success) {
    logger.warn(
      { deviceId: deviceIdFromTopic, issues: result.error.issues, event: 'status_payload_validation_failed' },
      'Invalid status payload',
    );
    return;
  }

  const payload = result.data;
  const receivedAtMs = Date.now();
  const messageId = payload.metadata?.message_id;
  const schemaVersion = payload.metadata?.schema_version;
  const seqNo = payload.metadata?.seq_no;
  const metadataBootId = payload.metadata?.boot_id;
  const sessionBootId = payload.boot_id ?? metadataBootId;
  const localSessionKey = resolveLocalSessionKey(
    payload.local_session_key,
    payload.session_id,
  );
  const payloadCanonicalSessionId = payload.canonical_session_id ?? null;
  const boundaryEvent = payload.boundary_event ?? 'none';

  if (payload.device_id !== deviceIdFromTopic) {
    logger.warn(
      { topicDeviceId: deviceIdFromTopic, payloadDeviceId: payload.device_id, event: 'status_device_id_mismatch' },
      'Status device id mismatch',
    );
    return;
  }

  const device = await verifyDeviceToken(payload.device_id, payload.auth_token);
  if (!device) {
    logger.warn({ deviceId: payload.device_id, event: 'device_auth_failed' }, 'Device auth failed');
    return;
  }

  const previousState = getStatus(payload.device_id);
  const previousStatus = previousState?.status ?? 'offline';
  const cachedStatus = toCachedStatus(payload.status);
  const runtimeState = normalizeRuntimeState({
    state: payload.state,
    legacyStatus: payload.status,
    previous: previousState?.runtimeState,
  });
  const stateUpdatedAt = new Date(receivedAtMs).toISOString();
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
        event: 'status_timestamp_normalized',
      },
      'Status timestamp normalized before publishing realtime events',
    );
  }

  const cachedResolvedSessionId = resolveSessionId(payload.device_id, {
    localSessionKey,
    canonicalSessionId: payloadCanonicalSessionId,
    bootId: sessionBootId,
  });
  const databaseResolvedSessionId =
    cachedResolvedSessionId === null
      ? await findDeviceSessionIdByIdentity(payload.device_id, {
          localSessionKey,
          canonicalSessionId: payloadCanonicalSessionId,
          bootId: sessionBootId,
        })
      : null;
  const resolvedSessionId = cachedResolvedSessionId ?? databaseResolvedSessionId;
  let sessionId = resolvedSessionId ?? previousState?.sessionId ?? null;
  let canonicalSessionId =
    payloadCanonicalSessionId ??
    previousState?.canonicalSessionId ??
    (resolvedSessionId !== null ? String(resolvedSessionId) : null);
  let sessionBoundarySource = 'firmware';

  if (boundaryEvent === 'started') {
    const ensuredSession = await ensureDeviceSession(payload.device_id, timestampMs, receivedAtMs, {
      localSessionKey,
      bootId: sessionBootId,
      canonicalSource: 'server',
      boundarySource: 'firmware',
      startReason: 'ignition_on',
    });

    if (!ensuredSession.isNew && ensuredSession.status !== 'running') {
      logger.warn(
        {
          deviceId: payload.device_id,
          sessionId: ensuredSession.sessionId,
          localSessionKey,
          bootId: sessionBootId,
          existingStatus: ensuredSession.status,
          messageId,
          event: 'status_boundary_started_ignored',
          reason: 'completed_authoritative_session',
        },
        'Started boundary ignored',
      );
      return;
    }

    sessionId = ensuredSession.sessionId;
    canonicalSessionId = String(ensuredSession.sessionId);

    setStatus(payload.device_id, 'running', {
      sessionId,
      runtimeState,
      localSessionKey,
      canonicalSessionId,
      bootId: sessionBootId,
    });
    await updateDeviceStatus(payload.device_id, 'running', receivedAtMs, runtimeState);
    publishAssignSession({
      deviceId: payload.device_id,
      localSessionKey,
      canonicalSessionId,
      bootId: sessionBootId,
    });

    if (ensuredSession.isNew) {
      publishInternalEvent('session', {
        device_id: payload.device_id,
        session_id: sessionId,
        action: 'started',
        boundary_source: 'firmware',
        local_session_key: localSessionKey,
        canonical_session_id: canonicalSessionId,
        boot_id: sessionBootId,
        message_id: messageId,
        schema_version: schemaVersion,
        seq_no: seqNo,
        timestamp: new Date(timestampMs).toISOString(),
      });
    }
  } else if (boundaryEvent === 'ended') {
    if (resolvedSessionId === null) {
      logger.warn(
        {
          deviceId: payload.device_id,
          localSessionKey,
          canonicalSessionId,
          bootId: sessionBootId,
          messageId,
          event: 'ended_boundary_ignored',
          reason: 'authoritative_session_missing',
        },
        'Ended boundary ignored',
      );
      return;
    } else {
      const completedSession = await completeDeviceSession(
        payload.device_id,
        timestampMs,
        resolvedSessionId,
        receivedAtMs,
        'stopped',
        {
          localSessionKey,
          bootId: sessionBootId,
          boundarySource: 'firmware',
          endReason: 'ignition_off',
        },
      );
      sessionId = completedSession.sessionId;
      clearSession(payload.device_id);
      setStatus(payload.device_id, 'stopped', {
        sessionId: null,
        runtimeState,
      });
      await updateDeviceStatus(payload.device_id, 'stopped', receivedAtMs, runtimeState);

      if (sessionId && !completedSession.discarded) {
        publishInternalEvent('session', {
          device_id: payload.device_id,
          session_id: sessionId,
          action: 'ended',
          boundary_source: 'firmware',
          local_session_key: localSessionKey,
          canonical_session_id: canonicalSessionId,
          boot_id: sessionBootId,
          message_id: messageId,
          schema_version: schemaVersion,
          seq_no: seqNo,
          timestamp: new Date(timestampMs).toISOString(),
        });
      }
    }
  } else if (cachedStatus === 'running' && sessionId === null) {
    const ensuredSession = await ensureDeviceSession(payload.device_id, timestampMs, receivedAtMs, {
      localSessionKey,
      bootId: sessionBootId,
      canonicalSource: 'server',
      boundarySource: SESSION_FALLBACK_BOUNDARY_SOURCE,
      startReason: 'status_running',
    });

    sessionId = ensuredSession.sessionId;
    canonicalSessionId = String(ensuredSession.sessionId);
    sessionBoundarySource = SESSION_FALLBACK_BOUNDARY_SOURCE;

    setStatus(payload.device_id, 'running', {
      sessionId,
      runtimeState,
      localSessionKey,
      canonicalSessionId,
      bootId: sessionBootId,
    });
    await updateDeviceStatus(payload.device_id, 'running', receivedAtMs, runtimeState);
    publishAssignSession({
      deviceId: payload.device_id,
      localSessionKey,
      canonicalSessionId,
      bootId: sessionBootId,
    });

    if (ensuredSession.isNew) {
      publishInternalEvent('session', {
        device_id: payload.device_id,
        session_id: sessionId,
        action: 'started',
        boundary_source: SESSION_FALLBACK_BOUNDARY_SOURCE,
        local_session_key: localSessionKey,
        canonical_session_id: canonicalSessionId,
        boot_id: sessionBootId,
        message_id: messageId,
        schema_version: schemaVersion,
        seq_no: seqNo,
        timestamp: new Date(timestampMs).toISOString(),
      });
    }
  } else if (cachedStatus === 'stopped') {
    const completedSession = await completeDeviceSession(
      payload.device_id,
      timestampMs,
      sessionId,
      receivedAtMs,
      'stopped',
      {
        localSessionKey,
        bootId: sessionBootId,
        boundarySource: SESSION_FALLBACK_BOUNDARY_SOURCE,
        endReason: 'status_stopped',
      },
    );

    sessionId = completedSession.sessionId;
    sessionBoundarySource = SESSION_FALLBACK_BOUNDARY_SOURCE;
    clearSession(payload.device_id);
    setStatus(payload.device_id, 'stopped', {
      sessionId: null,
      runtimeState,
    });
    await updateDeviceStatus(payload.device_id, 'stopped', receivedAtMs, runtimeState);

    if (sessionId && !completedSession.discarded) {
      publishInternalEvent('session', {
        device_id: payload.device_id,
        session_id: sessionId,
        action: 'ended',
        boundary_source: SESSION_FALLBACK_BOUNDARY_SOURCE,
        local_session_key: localSessionKey,
        canonical_session_id: canonicalSessionId,
        boot_id: sessionBootId,
        message_id: messageId,
        schema_version: schemaVersion,
        seq_no: seqNo,
        timestamp: new Date(timestampMs).toISOString(),
      });
    }
  } else {
    setStatus(payload.device_id, cachedStatus, {
      sessionId,
      runtimeState,
      localSessionKey,
      canonicalSessionId,
      bootId: sessionBootId,
    });
    await updateDeviceStatus(payload.device_id, cachedStatus, receivedAtMs, runtimeState);
  }

  const effectiveStatus = boundaryEvent === 'ended' ? 'stopped' : cachedStatus;

  writeDeviceEvent(
    payload.device_id,
    'status_change',
    `Device status: ${previousStatus} -> ${effectiveStatus}`,
    {
      session_id: sessionId,
      previous_status: previousStatus,
      current_status: effectiveStatus,
      reported_status: payload.status,
      boundary_event: boundaryEvent,
      boundary_source: sessionBoundarySource,
      local_session_key: localSessionKey,
      canonical_session_id: canonicalSessionId,
      message_id: messageId,
      schema_version: schemaVersion,
      seq_no: seqNo,
      boot_id: sessionBootId,
    },
  ).catch((err) => {
    logger.error({ err, deviceId: payload.device_id, event: 'status_change_log_write_failed' }, 'Status change log write failed');
  });

  publishInternalEvent('status', {
    device_id: payload.device_id,
    previous_status: previousStatus,
    current_status: effectiveStatus,
    reported_status: payload.status,
    boundary_event: boundaryEvent,
    boundary_source: sessionBoundarySource,
    local_session_key: localSessionKey,
    canonical_session_id: canonicalSessionId,
    ignition_state: runtimeState.ignition_state,
    motion_state: runtimeState.motion_state,
    vehicle_state: runtimeState.vehicle_state,
    device_state: runtimeState.device_state,
    sleep_mode: runtimeState.sleep_mode,
    state_updated_at: stateUpdatedAt,
    message_id: messageId,
    schema_version: schemaVersion,
    seq_no: seqNo,
    boot_id: sessionBootId,
  });
};
