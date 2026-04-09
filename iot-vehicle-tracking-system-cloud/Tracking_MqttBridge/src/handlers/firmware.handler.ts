import { firmwareStatusSchema } from '../validators/payload.validator';
import { pool } from '../infrastructure/database';
import { writeDeviceEvent } from '../infrastructure/victorialogs';
import { logger } from '../infrastructure/logger';
import { verifyDeviceToken } from '../services/device-auth.service';

const OTA_FINAL_STATUSES = new Set(['success', 'failed', 'rolled_back']);

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
    logger.warn(`Invalid JSON firmware status from device ${deviceIdFromTopic}`);
    return;
  }

  const result = firmwareStatusSchema.safeParse(parsed);
  if (!result.success) {
    logger.warn(
      { deviceId: deviceIdFromTopic, issues: result.error.issues },
      'Invalid firmware payload',
    );
    return;
  }

  const payload = result.data;
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

  // Upsert firmware update progress by job_id + device_id.
  try {
    const existing = await pool.query<{ id: number }>(
      `SELECT id
       FROM firmware_update_log
       WHERE job_id = $1 AND device_id = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [payload.jobId, payload.device_id],
    );

    const isFinal = OTA_FINAL_STATUSES.has(payload.status);

    if (existing.rows.length === 0) {
      await pool.query(
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
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9, NOW(), NOW())`,
        [
          payload.jobId,
          payload.device_id,
          payload.status,
          payload.progress ?? null,
          payload.targetVersion,
          payload.currentVersion,
          payload.partition ?? null,
          isFinal ? new Date() : null,
          payload.error ?? null,
        ],
      );
    } else {
      await pool.query(
        `UPDATE firmware_update_log
         SET status = $2,
             progress = $3,
             target_version = $4,
             current_version = $5,
             partition = $6,
             error_message = $7,
             completed_at = CASE WHEN $8 THEN NOW() ELSE completed_at END,
             updated_at = NOW()
         WHERE id = $1`,
        [
          existing.rows[0].id,
          payload.status,
          payload.progress ?? null,
          payload.targetVersion,
          payload.currentVersion,
          payload.partition ?? null,
          payload.error ?? null,
          isFinal,
        ],
      );
    }
  } catch (err) {
    logger.error(
      { err, deviceId: payload.device_id, jobId: payload.jobId },
      'Failed to log firmware status',
    );
  }

  // Write to VictoriaLogs
  writeDeviceEvent(
    payload.device_id,
    'firmware_update',
    `Firmware ${payload.status}: ${payload.targetVersion}`,
    {
      job_id: payload.jobId,
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
    },
  ).catch((err) => {
    logger.error(`VictoriaLogs write failed for firmware event`, err);
  });

  logger.info(
    `Firmware ${payload.status} for ${payload.device_id}: ` +
    `job=${payload.jobId} target=${payload.targetVersion} current=${payload.currentVersion} ` +
    `partition=${payload.partition ?? 'n/a'} progress=${payload.progress ?? 0}%` +
    (payload.error ? ` error=${payload.error}` : ''),
  );
};
