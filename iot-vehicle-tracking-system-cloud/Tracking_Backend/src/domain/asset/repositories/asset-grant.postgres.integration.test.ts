import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@/infrastructure/database/pool', async () => {
  const { Pool } = await import('pg');
  return {
    pool: new Pool({
      host: process.env.PGHOST ?? '127.0.0.1',
      port: Number(process.env.PGPORT ?? '5432'),
      user: process.env.PGUSER ?? 'ivts_test',
      password: process.env.PGPASSWORD ?? 'ivts_test_password',
      database: process.env.PGDATABASE ?? 'ivts_test_assets',
    }),
  };
});
import { pool } from '@/infrastructure/database/pool';
import { hasAssetGrant } from './asset-grant.repository';

const integration = process.env.IVTS_PG_INTEGRATION === '1' ? describe : describe.skip;
integration('real SQL asset grant checks', () => {
  beforeAll(async () => {
    if (process.env.PGDATABASE !== 'ivts_test_assets') {
      throw new Error('Unsafe asset grant fixture target');
    }
    await pool.query('CREATE TABLE user_device_access(user_id integer,device_id text)');
    await pool.query('CREATE TABLE vehicles(id integer PRIMARY KEY,vehicle_id text,device_id text)');
    await pool.query('CREATE TABLE trips(id integer PRIMARY KEY,vehicle_id text,device_id text)');
    await pool.query('CREATE TABLE maintenance(id integer PRIMARY KEY,vehicle_id text)');
    await pool.query("INSERT INTO user_device_access(user_id,device_id) VALUES(101,'D1'),(102,'D2')");
    await pool.query("INSERT INTO vehicles(id,vehicle_id,device_id) VALUES(1,'V1','D1'),(2,'V2','D2')");
    await pool.query("INSERT INTO trips(id,vehicle_id,device_id) VALUES(11,'V1',NULL),(12,'V2','D2')");
    await pool.query("INSERT INTO maintenance(id,vehicle_id) VALUES(21,'V1'),(22,'V2')");
  });
  afterAll(async () => { await pool.end(); });

  it('prevents U1 from writing U2 vehicle, trip and maintenance by ID', async () => {
    for (const [kind, accessible, foreign] of [
      ['vehicleRow', 1, 2],
      ['tripRow', 11, 12],
      ['maintenanceRow', 21, 22],
    ] as const) {
      expect(await hasAssetGrant(101, kind, accessible)).toBe(true);
      expect(await hasAssetGrant(101, kind, foreign)).toBe(false);
      expect(await hasAssetGrant(102, kind, foreign)).toBe(true);
    }
    expect(await hasAssetGrant(101, 'vehicleId', 'V1')).toBe(true);
    expect(await hasAssetGrant(101, 'vehicleId', 'V2')).toBe(false);
    expect(await hasAssetGrant(101, 'deviceId', 'D2')).toBe(false);
  });

  it('enforces revocation on the next SQL mutation guard', async () => {
    await pool.query("DELETE FROM user_device_access WHERE user_id=101 AND device_id='D1'");
    expect(await hasAssetGrant(101, 'vehicleRow', 1)).toBe(false);
    expect(await hasAssetGrant(101, 'tripRow', 11)).toBe(false);
    expect(await hasAssetGrant(101, 'maintenanceRow', 21)).toBe(false);
  });
});
