import { firmwareStatusSchema } from '../validators/payload.validator';
import { pool } from '../infrastructure/database';
import { writeDeviceEvent } from '../infrastructure/victorialogs';
import { logger } from '../infrastructure/logger';
import { verifyDeviceToken } from '../services/device-auth.service';

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

  // Log to firmware_update_log table
  try {
    await pool.query(
      `INSERT INTO firmware_update_log (
        device_id, status, progress, target_version, error_message, created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        payload.device_id,
        payload.status,
        payload.progress ?? null,
        payload.targetVersion,
        payload.error ?? null,
      ],
    );
  } catch (err) {
    logger.error(
      { err, deviceId: payload.device_id },
      'Failed to log firmware status',
    );
  }

  // Write to VictoriaLogs
  writeDeviceEvent(
    payload.device_id,
    'firmware_update',
    `Firmware ${payload.status}: ${payload.targetVersion}`,
    {
      firmware_status: payload.status,
      progress: payload.progress,
      target_version: payload.targetVersion,
      error: payload.error,
    },
  ).catch((err) => {
    logger.error(`VictoriaLogs write failed for firmware event`, err);
  });

  logger.info(
    `Firmware ${payload.status} for ${payload.device_id}: ` +
    `v${payload.targetVersion} (${payload.progress ?? 0}%)` +
    (payload.error ? ` error=${payload.error}` : ''),
  );
};
