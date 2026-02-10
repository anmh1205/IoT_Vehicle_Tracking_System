import { Pool } from 'pg';
import { dbConfig } from '../config/env';
import { logger } from './logger';

export const pool = new Pool({
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  max: 20,
});

export const query = (text: string, params?: unknown[]) => pool.query(text, params);

export const closePool = () => pool.end();

interface DeviceRow {
  id: string;
  device_id: string;
  vehicle_id: string | null;
  current_status: string;
}

/**
 * Validate device by checking device_id and comparing auth_token hash.
 * The devices table stores auth_token as SHA-256 hash.
 */
export async function validateDevice(
  deviceId: string,
  authToken: string,
): Promise<DeviceRow | null> {
  try {
    const result = await pool.query<DeviceRow>(
      `SELECT id, device_id, vehicle_id, current_status
       FROM devices
       WHERE device_id = $1
         AND auth_token = encode(sha256($2::bytea), 'hex')
         AND is_active = true`,
      [deviceId, authToken],
    );
    return result.rows[0] ?? null;
  } catch (err) {
    logger.error({ err, deviceId }, 'validateDevice failed');
    return null;
  }
}

/**
 * Update device status and last_seen_at timestamp.
 */
export async function updateDeviceStatus(
  deviceId: string,
  status: string,
): Promise<void> {
  try {
    await pool.query(
      `UPDATE devices
       SET current_status = $2, last_seen_at = NOW()
       WHERE device_id = $1`,
      [deviceId, status],
    );
  } catch (err) {
    logger.error({ err, deviceId }, 'updateDeviceStatus failed');
  }
}
