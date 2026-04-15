import { pool } from '../infrastructure/database';
import { logger } from '../infrastructure/logger';

interface AuthenticatedDevice {
  id: string;
  device_id: string;
  vehicle_id: string | null;
  current_status: string;
}

/**
 * Verify a device by checking device_id exists and auth_token hash matches.
 * Devices store auth_token as SHA-256 hash in the database.
 * Returns device row if valid, null otherwise.
 */
export const verifyDeviceToken = async (
  deviceId: string,
  authToken: string,
): Promise<AuthenticatedDevice | null> => {
  try {
    const result = await pool.query<AuthenticatedDevice>(
      `SELECT id, device_id, vehicle_id, current_status
       FROM devices
       WHERE device_id = $1
         AND (
           auth_token = encode(sha256($2::bytea), 'hex')
           OR auth_token = $3
         )
         AND is_active = true`,
      [deviceId, authToken, authToken],
    );
    return result.rows[0] ?? null;
  } catch (err) {
    logger.error({ err, deviceId }, 'Device auth verification failed');
    return null;
  }
};
