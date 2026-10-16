import { pool } from '../infrastructure/pool';

export interface AuthenticatedDeviceRow {
  id: string;
  device_id: string;
  vehicle_id: string | null;
  current_status: string;
  last_seen_at: string | null;
  state_updated_at: string | null;
  payload_updated_at: string | null;
}

/** The original bearer secret is hashed for comparison with the database
 * verifier. The verifier itself is never accepted as an authentication token. */
export const findAuthenticatedDevice = async (
  deviceId: string,
  rawToken: string,
): Promise<AuthenticatedDeviceRow | null> => {
  const result = await pool.query<AuthenticatedDeviceRow>(
    `SELECT id, device_id, vehicle_id, current_status
          , last_seen_at, state_updated_at, payload_updated_at
     FROM devices
     WHERE device_id = $1
       AND auth_token = encode(sha256($2::bytea), 'hex')
       AND is_active = true`,
    [deviceId, rawToken],
  );
  return result.rows[0] ?? null;
};
