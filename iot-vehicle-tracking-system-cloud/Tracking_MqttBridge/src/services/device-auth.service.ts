import { findAuthenticatedDevice, type AuthenticatedDeviceRow } from '../repositories/device-auth.repository';
import { logger } from '../infrastructure/logger';

/**
 * Verify a device by checking device_id exists and auth_token hash matches.
 * Devices store auth_token as SHA-256 hash in the database.
 * Returns device row if valid, null otherwise.
 */
export const verifyDeviceToken = async (
  deviceId: string,
  authToken: string,
): Promise<AuthenticatedDeviceRow | null> => {
  try {
    return await findAuthenticatedDevice(deviceId, authToken);
  } catch (err) {
    logger.error({ err, deviceId, event: 'device_auth_verification_failed' }, 'Device auth verification failed');
    throw err;
  }
};
