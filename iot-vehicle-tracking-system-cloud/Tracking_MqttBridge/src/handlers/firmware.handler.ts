import { firmwareStatusSchema } from '../validators/payload.validator';
import { pool } from '../infrastructure/database';
import { writeDeviceEvent } from '../infrastructure/victorialogs';
import { logger } from '../infrastructure/logger';
import { publishInternalEvent } from '../publishers/internal-event.publisher';
import { verifyDeviceToken } from '../services/device-auth.service';

const OTA_TERMINAL_STATUSES = new Set(['success', 'failed', 'rolled_back']);

interface FirmwareLogRow {
  id: number;
  status: string;
  progress: number | null;
  last_message_id: string | null;
  last_seq_no: number | null;
  last_boot_id: string | null;
}

interface UpdateDecision {
  accept: boolean;
  reason: string;
}

const decideFirmwareUpdate = (
  existing: FirmwareLogRow | null,
  payload: {
    status: string;
    progress?: number;
    metadata?: {
      message_id?: string;
      seq_no?: number;
      boot_id?: string;
    };
  },
): UpdateDecision => {
  if (!existing) {
    return { accept: true, reason: 'new_job' };
  }

  const incomingMessageId = payload.metadata?.message_id;
  const incomingSeqNo = payload.metadata?.seq_no;
  const incomingBootId = payload.metadata?.boot_id;
  const bootChanged =
    incomingBootId !== undefined &&
    incomingBootId !== null &&
    existing.last_boot_id !== null &&
    incomingBootId !== existing.last_boot_id;
  const existingIsTerminal = OTA_TERMINAL_STATUSES.has(existing.status);
  const incomingIsTerminal = OTA_TERMINAL_STATUSES.has(payload.status);

  if (incomingMessageId && existing.last_message_id === incomingMessageId) {
    return { accept: false, reason: 'duplicate_message_id' };
  }

  if (
    incomingSeqNo !== undefined &&
    existing.last_seq_no !== null &&
    incomingSeqNo < existing.last_seq_no &&
    !bootChanged
  ) {
    return { accept: false, reason: 'out_of_order_seq' };
  }

  if (existingIsTerminal && !incomingIsTerminal) {
    return { accept: false, reason: 'terminal_sticky' };
  }

  if (
    incomingSeqNo !== undefined &&
    existing.last_seq_no !== null &&
    incomingSeqNo === existing.last_seq_no &&
    payload.status === existing.status &&
    (payload.progress ?? existing.progress ?? 0) <= (existing.progress ?? 0)
  ) {
    return { accept: false, reason: 'duplicate_seq_snapshot' };
  }

  if (bootChanged) {
    return { accept: true, reason: 'boot_seq_reset' };
  }

  return { accept: true, reason: existingIsTerminal ? 'terminal_override' : 'state_advance' };
};

/**
 * Handle firmware update progress on topic v1/{deviceId}/firmware.
 * Logs firmware update status to the firmware_update_log table.
 */
export const handleFirmware = async (
  deviceIdFromTopic: string,
  message: Buffer,
): Promise<void> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(message.toString());
  } catch {
    logger.warn({ deviceId: deviceIdFromTopic, event: 'firmware_payload_invalid_json' }, 'Invalid firmware payload');
    return;
  }

  const result = firmwareStatusSchema.safeParse(parsed);
  if (!result.success) {
    logger.warn(
      { deviceId: deviceIdFromTopic, issues: result.error.issues, event: 'firmware_payload_validation_failed' },
      'Invalid firmware payload',
    );
    return;
  }

  const payload = result.data;
  const messageId = payload.metadata?.message_id;
  const schemaVersion = payload.metadata?.schema_version;
  const seqNo = payload.metadata?.seq_no;
  const bootId = payload.metadata?.boot_id;
  const isFinal = OTA_TERMINAL_STATUSES.has(payload.status);

  if (payload.device_id !== deviceIdFromTopic) {
    logger.warn(
      { topicDeviceId: deviceIdFromTopic, payloadDeviceId: payload.device_id, event: 'firmware_device_id_mismatch' },
      'Firmware device id mismatch',
    );
    return;
  }

  const device = await verifyDeviceToken(payload.device_id, payload.auth_token);
  if (!device) {
    logger.warn({ deviceId: payload.device_id, event: 'device_auth_failed' }, 'Device auth failed');
    return;
  }

  const jobId = payload.jobId.trim();
  if (!jobId) {
    if (payload.status !== 'success') {
      logger.warn(
        {
          deviceId: payload.device_id,
          status: payload.status,
          event: 'jobless_firmware_status_ignored',
        },
        'Ignored non-success firmware status without deployment job',
      );
      return;
    }

    try {
      await pool.query(
        `UPDATE devices
         SET firmware_version = $2,
             target_firmware_version = CASE
               WHEN target_firmware_version = $2 THEN NULL
               ELSE target_firmware_version
             END,
             updated_at = NOW()
         WHERE device_id = $1`,
        [payload.device_id, payload.currentVersion],
      );
    } catch (err) {
      logger.error(
        {
          err,
          deviceId: payload.device_id,
          currentVersion: payload.currentVersion,
          event: 'firmware_inventory_sync_failed',
        },
        'Firmware inventory sync failed',
      );
      return;
    }

    writeDeviceEvent(
      payload.device_id,
      'firmware_inventory',
      `Firmware inventory: ${payload.currentVersion}`,
      {
        current_version: payload.currentVersion,
        target_version: payload.targetVersion,
        message_id: messageId,
        schema_version: schemaVersion,
        seq_no: seqNo,
        boot_id: bootId,
      },
    ).catch((err) => {
      logger.error(
        { err, deviceId: payload.device_id, event: 'firmware_inventory_log_write_failed' },
        'Firmware inventory event log write failed',
      );
    });

    logger.info(
      {
        deviceId: payload.device_id,
        currentVersion: payload.currentVersion,
        bootId,
        event: 'firmware_inventory_synced',
      },
      'Firmware inventory synchronized',
    );
    return;
  }

  let updateDecision: UpdateDecision = { accept: true, reason: 'unknown' };
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    /*
     * Serialize all lifecycle decisions for one device before reading the job
     * row. This also covers an unknown/new job where there is no deployment row
     * available to lock yet.
     */
    await client.query(
      'SELECT device_id FROM devices WHERE device_id = $1 FOR UPDATE',
      [payload.device_id],
    );

    const existingResult = await client.query<FirmwareLogRow>(
      `SELECT id, status, progress, last_message_id, last_seq_no,
              last_boot_id
       FROM firmware_update_log
       WHERE job_id = $1 AND device_id = $2
       ORDER BY updated_at DESC
       LIMIT 1
       FOR UPDATE`,
      [jobId, payload.device_id],
    );

    const existing = existingResult.rows[0] ?? null;
    updateDecision = decideFirmwareUpdate(existing, payload);

    if (!updateDecision.accept) {
      await client.query('COMMIT');
      logger.info(
        {
          jobId,
          deviceId: payload.device_id,
          status: payload.status,
          seqNo,
          messageId,
          reason: updateDecision.reason,
          event: 'firmware_update_ignored',
        },
        'Ignored firmware update payload',
      );
      return;
    }

    if (!existing) {
      await client.query(
        `INSERT INTO firmware_update_log (
          job_id,
          device_id,
          status,
          progress,
          target_version,
          current_version,
          partition,
          started_at,
          completed_at,
          error_message,
          status_reason_code,
          first_assigned_at,
          last_seen_at,
          last_message_id,
          last_seq_no,
          last_boot_id,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          NOW(),
          $8,
          $9,
          $10,
          NOW(),
          NOW(),
          $11,
          $12,
          $13,
          NOW(),
          NOW()
        )`,
        [
          jobId,
          payload.device_id,
          payload.status,
          payload.progress ?? null,
          payload.targetVersion,
          payload.currentVersion,
          payload.partition ?? null,
          isFinal ? new Date() : null,
          payload.error ?? null,
          payload.error ?? null,
          messageId ?? null,
          seqNo ?? null,
          bootId ?? null,
        ],
      );
    } else {
      const shouldMarkStarted = payload.status !== 'assigned';
      const resetSequenceWatermark = updateDecision.reason === 'boot_seq_reset';
      await client.query(
        `UPDATE firmware_update_log
         SET status = $2::firmware_status_enum,
             progress = COALESCE($3, progress),
             target_version = $4,
             current_version = $5,
             partition = $6,
             error_message = $7,
             status_reason_code = $8,
             started_at = CASE
               WHEN started_at IS NULL AND $13 THEN NOW()
               ELSE started_at
             END,
             completed_at = CASE WHEN $9 THEN NOW() ELSE completed_at END,
             last_seen_at = NOW(),
             last_message_id = COALESCE($10, last_message_id),
             last_seq_no = CASE
               WHEN $14::boolean AND $11::BIGINT IS NOT NULL THEN $11::BIGINT
               WHEN $11::BIGINT IS NULL THEN last_seq_no
               ELSE GREATEST(COALESCE(last_seq_no, -1::BIGINT), $11::BIGINT)
             END,
             last_boot_id = COALESCE($12, last_boot_id),
             updated_at = NOW()
         WHERE id = $1`,
        [
          existing.id,
          payload.status,
          payload.progress ?? null,
          payload.targetVersion,
          payload.currentVersion,
          payload.partition ?? null,
          payload.error ?? null,
          payload.error ?? null,
          isFinal,
          messageId ?? null,
          seqNo ?? null,
          bootId ?? null,
          shouldMarkStarted,
          resetSequenceWatermark,
        ],
      );
    }

    if (payload.status === 'success') {
      /*
       * Keep firmware inventory and deployment terminal state atomic. A reader
       * must never observe a committed OTA success paired with the old device
       * firmware inventory merely because a second query failed later.
       */
      await client.query(
        `UPDATE devices
         SET firmware_version = $2,
             target_firmware_version = CASE
               WHEN target_firmware_version = $2 OR target_firmware_version = $3 THEN NULL
               ELSE target_firmware_version
             END,
             updated_at = NOW()
         WHERE device_id = $1`,
        [payload.device_id, payload.currentVersion, payload.targetVersion],
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Preserve the original database error.
    }
    logger.error(
      { err, deviceId: payload.device_id, jobId, event: 'firmware_status_log_failed' },
      'Firmware status log failed',
    );
    return;
  } finally {
    client.release();
  }

  publishInternalEvent('firmware', {
    jobId,
    device_id: payload.device_id,
    status: payload.status,
    progress: payload.progress,
    targetVersion: payload.targetVersion,
    currentVersion: payload.currentVersion,
    partition: payload.partition,
    error: payload.error,
    message_id: messageId,
    schema_version: schemaVersion,
    seq_no: seqNo,
    boot_id: bootId,
  });

  writeDeviceEvent(
    payload.device_id,
    'firmware_update',
    `Firmware ${payload.status}: ${payload.targetVersion}`,
    {
      job_id: jobId,
      firmware_status: payload.status,
      progress: payload.progress,
      target_version: payload.targetVersion,
      current_version: payload.currentVersion,
      partition: payload.partition,
      error: payload.error,
      message_id: messageId,
      schema_version: schemaVersion,
      seq_no: seqNo,
      boot_id: bootId,
      update_reason: updateDecision.reason,
    },
  ).catch((err) => {
    logger.error({ err, deviceId: payload.device_id, jobId, event: 'firmware_event_log_write_failed' }, 'Firmware event log write failed');
  });

  logger.info(
    {
      deviceId: payload.device_id,
      jobId,
      status: payload.status,
      targetVersion: payload.targetVersion,
      currentVersion: payload.currentVersion,
      partition: payload.partition ?? null,
      progress: payload.progress ?? 0,
      error: payload.error ?? null,
      event: 'firmware_status_processed',
    },
    'Firmware status processed',
  );
};
