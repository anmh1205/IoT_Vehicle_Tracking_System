import { createHash } from 'node:crypto';
import { findAuthenticatedDevice, type AuthenticatedDeviceRow } from '../repositories/device-auth.repository';
import { logger } from '../infrastructure/logger';

/*
 * Coalesce concurrent lookups only. Do NOT cache successful authentication
 * across sequential requests: a revoked/deactivated device must fail closed on
 * the very next message, even if it was authenticated milliseconds earlier.
 */
const inFlight = new Map<string, Promise<AuthenticatedDeviceRow | null>>();

/** Verify raw bearer secret against the current active-device DB verifier. */
export const verifyDeviceToken = async (
  deviceId: string,
  authToken: string,
): Promise<AuthenticatedDeviceRow | null> => {
  const key = `${deviceId}:${createHash('sha256').update(authToken, 'utf8').digest('hex')}`;
  const pending = inFlight.get(key);
  if (pending) return pending;
  const lookup = findAuthenticatedDevice(deviceId, authToken);
  inFlight.set(key, lookup);
  try {
    return await lookup;
  } catch (err) {
    logger.error({ err, deviceId, event: 'device_auth_verification_failed' }, 'Device auth verification failed');
    throw err;
  } finally {
    inFlight.delete(key);
  }
};
