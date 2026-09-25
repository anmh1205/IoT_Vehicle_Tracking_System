import { publishInternalEvent } from '../publishers/internal-event.publisher';

interface SupersededSessionEventInput {
  deviceId: string;
  retiredSessionIds: number[];
  timestampMs: number;
  messageId?: string;
  schemaVersion?: string;
  seqNo?: number;
}

/**
 * Publish lifecycle closure for sessions atomically retired while reconciling a
 * newer session. Do not copy the incoming session boot/local identity: those
 * values belong to the replacement session, not the retired one.
 */
export const publishSupersededSessionEnds = (
  input: SupersededSessionEventInput,
): void => {
  const uniqueIds = Array.from(new Set(input.retiredSessionIds))
    .filter((sessionId) => Number.isSafeInteger(sessionId) && sessionId > 0)
    .sort((a, b) => a - b);

  uniqueIds.forEach((sessionId) => {
    publishInternalEvent('session', {
      device_id: input.deviceId,
      session_id: sessionId,
      action: 'ended',
      boundary_source: 'bridge_superseded',
      canonical_session_id: String(sessionId),
      end_reason: 'superseded',
      message_id:
        input.messageId == null
          ? undefined
          : `${input.messageId}:superseded:${sessionId}`,
      schema_version: input.schemaVersion,
      seq_no: input.seqNo,
      timestamp: new Date(input.timestampMs).toISOString(),
    });
  });
};
