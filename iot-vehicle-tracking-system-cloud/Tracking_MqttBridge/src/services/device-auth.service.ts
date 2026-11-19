import { createHash } from 'node:crypto';
import { findAuthenticatedDevice, type AuthenticatedDeviceRow } from '../repositories/device-auth.repository';
import { logger } from '../infrastructure/logger';

const AUTH_POSITIVE_TTL_MS = 8_000;
const AUTH_CACHE_MAX_ENTRIES = 2_048;
const positiveCache = new Map<string, { device: AuthenticatedDeviceRow; expiresAt: number }>();
const inFlight = new Map<string, Promise<AuthenticatedDeviceRow | null>>();

/**
 * Verify a device by checking device_id exists and auth_token hash matches.
 * Devices store auth_token as SHA-256 hash in the database.
 * Returns device row if valid, null otherwise.
 */
export const verifyDeviceToken = async (
  deviceId: string,
  authToken: string,
): Promise<AuthenticatedDeviceRow | null> => {
  // Short positive-only cache; token is hashed, not retained as a cache key.
  const tokenDigest = createHash('sha256').update(authToken, 'utf8').digest('hex');
  const key = `${deviceId}:${tokenDigest}`;
  const now = Date.now();
  const cached = positiveCache.get(key);
  if (cached && cached.expiresAt > now) return cached.device;
  if (cached) positiveCache.delete(key);
  const pending = inFlight.get(key);
  if (pending) return pending;
  const lookup = findAuthenticatedDevice(deviceId, authToken);
  inFlight.set(key, lookup);
  try {
    const device = await lookup;
    if (device) {
      if (positiveCache.size >= AUTH_CACHE_MAX_ENTRIES) positiveCache.clear();
      positiveCache.set(key, { device, expiresAt: Date.now() + AUTH_POSITIVE_TTL_MS });
    }
    return device;
  } catch (err) {
    logger.error({ err, deviceId, event: 'device_auth_verification_failed' }, 'Device auth verification failed');
    throw err;
  } finally {
    inFlight.delete(key);
  }
};
