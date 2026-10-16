import { pool } from '@/infrastructure/database/pool';
import { appConfig, dbConfig, mqttConfig } from '@/config/env';

/** The simulator must never write to a production or ordinary fleet DB. */
export const simulatorDatabaseIsIsolated = (): boolean =>
  !appConfig.isProduction &&
  (appConfig.nodeEnv === 'development' || appConfig.nodeEnv === 'test') &&
  process.env.SIMULATOR_ISOLATED_TEST_MODE === 'true' &&
  dbConfig.database.startsWith('ivts_simulator_') &&
  process.env.SIMULATOR_ISOLATED_DATABASE === dbConfig.database &&
  Boolean(process.env.SIMULATOR_ISOLATED_BROKER_HOST) &&
  process.env.SIMULATOR_ISOLATED_BROKER_HOST === mqttConfig.host;

const requireIsolation = (): void => {
  if (!simulatorDatabaseIsIsolated()) {
    throw new Error('Simulator auth lease is disabled outside an explicitly isolated database/broker');
  }
};

/** Values are database password hashes, never bearer tokens. */
export interface SimulatorCredentialCheckpoint {
  deviceId: string;
  originalAuthTokenHash: string;
  simulatorAuthTokenHash: string;
}

interface SavedLeaseRow {
  device_id: string;
  original_hash: string;
  simulator_hash: string;
}

export const ensureSimulatorCredentialLeases = async (): Promise<void> => {
  requireIsolation();
  // Deliberately created only in the isolated SIM test database. Production
  // installations never need or receive a table of historic auth hashes.
  await pool.query(`CREATE TABLE IF NOT EXISTS simulator_auth_leases (
    device_id text PRIMARY KEY,
    original_hash text NOT NULL,
    simulator_hash text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT NOW()
  )`);
};

/** All swaps are atomic. A failed second update rolls back the first swap. */
export const swapSimulatorCredentialLeases = async (
  checkpoints: SimulatorCredentialCheckpoint[],
): Promise<void> => {
  requireIsolation();
  if (checkpoints.length === 0) return;
  await ensureSimulatorCredentialLeases();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const item of checkpoints) {
      if (!item.deviceId.startsWith('SIM-') ||
          !item.originalAuthTokenHash || !item.simulatorAuthTokenHash) {
        throw new Error('SIM credential checkpoint is incomplete');
      }
      const original = await client.query<{ auth_token: string | null }>(
        `SELECT auth_token FROM devices WHERE device_id = $1 FOR UPDATE`,
        [item.deviceId],
      );
      if (original.rows[0]?.auth_token !== item.originalAuthTokenHash) {
        throw new Error('Simulator device credential changed before protected swap');
      }
      const session = await client.query(
        `SELECT 1 FROM device_sessions WHERE device_id = $1
         AND status = 'running' LIMIT 1`, [item.deviceId],
      );
      if ((session.rowCount ?? 0) !== 0) {
        throw new Error('Cannot replace a device with a running session');
      }
      const inserted = await client.query(
        `INSERT INTO simulator_auth_leases(device_id,original_hash,simulator_hash)
         VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING device_id`,
        [item.deviceId, item.originalAuthTokenHash, item.simulatorAuthTokenHash],
      );
      if (inserted.rowCount !== 1) throw new Error('Simulator identity has an unrecovered credential lease');
      const updated = await client.query(
        `UPDATE devices SET auth_token = $2, updated_at = NOW()
         WHERE device_id = $1 AND auth_token = $3
           AND NOT EXISTS (SELECT 1 FROM device_sessions
                           WHERE device_id = $1 AND status = 'running')`,
        [item.deviceId, item.simulatorAuthTokenHash, item.originalAuthTokenHash],
      );
      if (updated.rowCount !== 1) throw new Error('Simulator credential could not be swapped safely');
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/** Idempotent restart/stop recovery. A rotated non-SIM credential is never
 * overwritten; the old lease is discarded if DB auth no longer matches it. */
export const restoreSimulatorCredentialLeases = async (
  deviceIds?: string[],
): Promise<number> => {
  requireIsolation();
  await ensureSimulatorCredentialLeases();
  const client = await pool.connect();
  let restored = 0;
  try {
    await client.query('BEGIN');
    const leases = await client.query<SavedLeaseRow>(
      `SELECT device_id, original_hash, simulator_hash
       FROM simulator_auth_leases
       WHERE ($1::text[] IS NULL OR device_id = ANY($1::text[]))
       ORDER BY device_id FOR UPDATE`,
      [deviceIds ?? null],
    );
    for (const lease of leases.rows) {
      const result = await client.query(
        `UPDATE devices SET auth_token = $2, updated_at = NOW()
         WHERE device_id = $1 AND auth_token = $3 AND device_id LIKE 'SIM-%'`,
        [lease.device_id, lease.original_hash, lease.simulator_hash],
      );
      restored += result.rowCount ?? 0;
      await client.query('DELETE FROM simulator_auth_leases WHERE device_id = $1', [lease.device_id]);
    }
    await client.query('COMMIT');
    return restored;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
