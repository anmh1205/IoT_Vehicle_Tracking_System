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
import { update as updateVehicleRow } from '@/domain/vehicle/repositories/vehicle.repository';
import { update as updateMaintenanceRow } from '@/domain/maintenance/repositories/maintenance.repository';

const integration = process.env.IVTS_PG_INTEGRATION === '1' ? describe : describe.skip;
integration('real SQL asset grant checks', () => {
  beforeAll(async () => {
    if (process.env.PGDATABASE !== 'ivts_test_assets') {
      throw new Error('Unsafe asset grant fixture target');
    }
    await pool.query('CREATE TABLE user_device_access(user_id integer,device_id text)');
    await pool.query('CREATE TABLE vehicles(id integer PRIMARY KEY,vehicle_id text,device_id text,notes text,updated_at timestamptz DEFAULT NOW())');
    await pool.query('CREATE TABLE trips(id integer PRIMARY KEY,vehicle_id text,device_id text)');
    await pool.query('CREATE TABLE maintenance(id integer PRIMARY KEY,vehicle_id text,notes text,updated_at timestamptz DEFAULT NOW())');
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

  it('executes a vehicle mutation only with the current grant in the same UPDATE', async () => {
    const u1 = { userId: 101, role: 'operator', deviceAccessMode: 'assigned' };
    const denied = await updateVehicleRow(2, { notes: 'attempted cross-fleet edit' }, u1);
    expect(denied).toBeNull();
    const foreign = await pool.query('SELECT notes FROM vehicles WHERE id=2');
    expect(foreign.rows[0].notes).toBeNull();

    const own = await updateVehicleRow(1, { notes: 'allowed fleet edit' }, u1);
    expect(own?.notes).toBe('allowed fleet edit');
  });
  it('allows maintenance writes only when the actor has a live vehicle grant', async () => {
    const u1 = { userId: 101, role: 'operator', deviceAccessMode: 'assigned' };
    const denied = await updateMaintenanceRow(22, { notes: 'cross-tenant attempt' }, u1);
    expect(denied).toBeNull();
    const foreign = await pool.query('SELECT notes FROM maintenance WHERE id=22');
    expect(foreign.rows[0].notes).toBeNull();

    const own = await updateMaintenanceRow(21, { notes: 'service completed' }, u1);
    expect(own?.notes).toBe('service completed');
    const admin = { userId: 1, role: 'admin', deviceAccessMode: 'all' };
    expect((await updateMaintenanceRow(22, { notes: 'admin edit' }, admin))?.notes).toBe('admin edit');
  });

  it('enforces revocation on the next SQL mutation guard', async () => {
    await pool.query("DELETE FROM user_device_access WHERE user_id=101 AND device_id='D1'");
    expect(await hasAssetGrant(101, 'vehicleRow', 1)).toBe(false);
    expect(await updateVehicleRow(1, { notes: 'edit after revoke' }, { userId: 101, role: 'operator', deviceAccessMode: 'assigned' })).toBeNull();
    const row = await pool.query('SELECT notes FROM vehicles WHERE id=1');
    expect(row.rows[0].notes).toBe('allowed fleet edit');
    expect(await hasAssetGrant(101, 'tripRow', 11)).toBe(false);
    expect(await hasAssetGrant(101, 'maintenanceRow', 21)).toBe(false);
    expect(await updateMaintenanceRow(21, { notes: 'edit after revoke' },
      { userId: 101, role: 'operator', deviceAccessMode: 'assigned' })).toBeNull();
    const maintenance = await pool.query('SELECT notes FROM maintenance WHERE id=21');
    expect(maintenance.rows[0].notes).toBe('service completed');
  });
});
