import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/infrastructure/database/pool', async () => {
  const { Pool } = await import('pg');
  return { pool: new Pool({
    host: process.env.PGHOST ?? '127.0.0.1',
    port: Number(process.env.PGPORT ?? '5432'),
    user: process.env.PGUSER ?? 'ivts_test',
    password: process.env.PGPASSWORD ?? 'ivts_test_password',
    database: process.env.PGDATABASE ?? 'ivts_simulator_ci',
  }) };
});
vi.mock('@/config/env', () => ({
  appConfig: { isProduction: false, nodeEnv: 'test' },
  dbConfig: { database: 'ivts_simulator_ci' },
  mqttConfig: { host: 'isolated-broker.local' },
}));
import { pool } from '@/infrastructure/database/pool';
import {
  restoreSimulatorCredentialLeases,
  simulatorDatabaseIsIsolated,
  swapSimulatorCredentialLeases,
} from './simulator-auth-lease.repository';

const integration = process.env.IVTS_PG_INTEGRATION === '1' ? describe : describe.skip;
integration('SIM-only credential leases and recovery with real PostgreSQL', () => {
  beforeAll(async () => {
    if (process.env.PGDATABASE !== 'ivts_simulator_ci') {
      throw new Error('Refusing simulator integration test outside isolated PostgreSQL');
    }
    vi.stubEnv('SIMULATOR_ISOLATED_TEST_MODE', 'true');
    vi.stubEnv('SIMULATOR_ISOLATED_DATABASE', 'ivts_simulator_ci');
    vi.stubEnv('SIMULATOR_ISOLATED_BROKER_HOST', 'isolated-broker.local');
    await pool.query(`CREATE TABLE devices(
      device_id text PRIMARY KEY, auth_token text, updated_at timestamptz DEFAULT NOW())`);
    await pool.query(`CREATE TABLE device_sessions(
      id integer PRIMARY KEY, device_id text, status text, created_at timestamptz DEFAULT NOW())`);
    await pool.query(`INSERT INTO devices(device_id,auth_token) VALUES
      ('SIM-A','hash-original-a'),('SIM-B','hash-original-b'),
      ('SIM-C','hash-original-c'),('REAL-01','hash-real')`);
    await pool.query("INSERT INTO device_sessions(id,device_id,status) VALUES(7,'SIM-C','running')");
  });

  afterAll(async () => {
    vi.unstubAllEnvs();
    await pool.end();
  });

  beforeEach(async () => {
    // Every test begins from original SIM auth state and no lease;
    // this is an ephemeral CI database, never an operator's system.
    await pool.query("UPDATE devices SET auth_token='hash-original-a' WHERE device_id='SIM-A'");
    await pool.query("UPDATE devices SET auth_token='hash-original-b' WHERE device_id='SIM-B'");
    await pool.query("UPDATE devices SET auth_token='hash-original-c' WHERE device_id='SIM-C'");
    await pool.query("UPDATE devices SET auth_token='hash-real' WHERE device_id='REAL-01'");
    await pool.query('CREATE TABLE IF NOT EXISTS simulator_auth_leases(device_id text PRIMARY KEY, original_hash text NOT NULL, simulator_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT NOW())');
    await pool.query('DELETE FROM simulator_auth_leases');
  });

  const a = { deviceId: 'SIM-A', originalAuthTokenHash: 'hash-original-a', simulatorAuthTokenHash: 'hash-temp-a' };
  const b = { deviceId: 'SIM-B', originalAuthTokenHash: 'hash-original-b', simulatorAuthTokenHash: 'hash-temp-b' };
  const c = { deviceId: 'SIM-C', originalAuthTokenHash: 'hash-original-c', simulatorAuthTokenHash: 'hash-temp-c' };
  const credential = async (id: string): Promise<string> =>
    (await pool.query<{ auth_token: string }>('SELECT auth_token FROM devices WHERE device_id = $1', [id])).rows[0].auth_token;

  it('atomically swaps multiple SIM identities and recovers them after process restart', async () => {
    expect(simulatorDatabaseIsIsolated()).toBe(true);
    await swapSimulatorCredentialLeases([a, b]);
    expect(await credential('SIM-A')).toBe('hash-temp-a');
    expect(await credential('SIM-B')).toBe('hash-temp-b');
    expect(Number((await pool.query('SELECT COUNT(*)::integer AS total FROM simulator_auth_leases')).rows[0].total)).toBe(2);

    // Restart simulation: no in-memory runtimes supplied.
    expect(await restoreSimulatorCredentialLeases()).toBe(2);
    expect(await credential('SIM-A')).toBe('hash-original-a');
    expect(await credential('SIM-B')).toBe('hash-original-b');
    expect(await restoreSimulatorCredentialLeases()).toBe(0);
    expect((await pool.query('SELECT * FROM simulator_auth_leases')).rowCount).toBe(0);
  });

  it('rolls back all device swaps if the second SIM identity has a running session', async () => {
    await expect(swapSimulatorCredentialLeases([a, c]))
      .rejects.toThrow('Cannot replace a device with a running session');
    expect(await credential('SIM-A')).toBe('hash-original-a');
    expect(await credential('SIM-C')).toBe('hash-original-c');
    expect((await pool.query('SELECT * FROM simulator_auth_leases')).rowCount).toBe(0);
  });

  it('never overwrites an out-of-band credential rotation during recovery', async () => {
    await swapSimulatorCredentialLeases([a]);
    await pool.query("UPDATE devices SET auth_token='new-secure-hash' WHERE device_id='SIM-A'");
    expect(await restoreSimulatorCredentialLeases()).toBe(0);
    expect(await credential('SIM-A')).toBe('new-secure-hash');
    expect((await pool.query('SELECT * FROM simulator_auth_leases')).rowCount).toBe(0);
  });

  it('fails closed for real identities and without explicit isolated env', async () => {
    await expect(swapSimulatorCredentialLeases([
      { deviceId: 'REAL-01', originalAuthTokenHash:'hash-real', simulatorAuthTokenHash:'sim-temp' },
    ])).rejects.toThrow('SIM credential checkpoint');
    expect(await credential('REAL-01')).toBe('hash-real');
    vi.stubEnv('SIMULATOR_ISOLATED_TEST_MODE', 'false');
    expect(simulatorDatabaseIsIsolated()).toBe(false);
    await expect(swapSimulatorCredentialLeases([a])).rejects.toThrow('disabled');
    vi.stubEnv('SIMULATOR_ISOLATED_TEST_MODE', 'true');
  });

  it('does not overwrite a lease already owned by another SIM worker', async () => {
    await swapSimulatorCredentialLeases([a]);
    await expect(swapSimulatorCredentialLeases([a])).rejects.toThrow('changed before protected swap');
    expect(await credential('SIM-A')).toBe('hash-temp-a');
    expect((await pool.query('SELECT * FROM simulator_auth_leases')).rowCount).toBe(1);
  });
});
