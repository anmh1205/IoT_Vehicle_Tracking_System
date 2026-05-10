import { logger } from '../infrastructure/logger';
import { publishToDevice } from '../mqtt/client';

export interface SessionAssignmentParams {
  deviceId: string;
  localSessionKey?: number;
  canonicalSessionId: string;
  bootId?: string;
}

export const publishSessionAssignment = (params: SessionAssignmentParams): void => {
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
