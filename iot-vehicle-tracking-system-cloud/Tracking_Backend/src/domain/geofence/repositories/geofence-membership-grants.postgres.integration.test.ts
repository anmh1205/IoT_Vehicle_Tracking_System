import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@/infrastructure/database/pool', async () => {
  const { Client } = await import('pg');
  return { pool: new Client({
    host: process.env.PGHOST ?? '127.0.0.1',
    port: Number(process.env.PGPORT ?? '5432'),
    user: process.env.PGUSER ?? 'ivts_test',
    password: process.env.PGPASSWORD ?? 'ivts_test_password',
    database: process.env.PGDATABASE ?? 'ivts_test_assets',
  }) };
});
import { pool } from '@/infrastructure/database/pool';
import { assignVehicle, unassignVehicle, update as updateGeofence } from './geofence.repository';

const integration = process.env.IVTS_PG_INTEGRATION === '1' ? describe : describe.skip;
const assigned = { userId: 101, role: 'manager', deviceAccessMode: 'assigned' };
const admin = { userId: 1, role: 'admin', deviceAccessMode: 'all' };

integration('geofence membership SQL authorization', () => {
  beforeAll(async () => {
    if (process.env.PGDATABASE !== 'ivts_test_assets') throw new Error('Unsafe test database');
    await pool.connect();
    await pool.query('CREATE TEMP TABLE user_device_access(user_id int, device_id text)');
    await pool.query('CREATE TEMP TABLE vehicles(vehicle_id text PRIMARY KEY, device_id text)');
    await pool.query('CREATE TEMP TABLE geofences(id integer PRIMARY KEY, created_by integer, name text, updated_at timestamptz)');
    await pool.query(`CREATE TEMP TABLE geofence_vehicles(
      geofence_id integer, vehicle_id text, assigned_at timestamptz DEFAULT NOW(),
      UNIQUE (geofence_id, vehicle_id)
    )`);
    await pool.query("INSERT INTO user_device_access VALUES (101,'D1'), (102,'D2')");
    await pool.query("INSERT INTO vehicles VALUES ('V1','D1'), ('V2','D2')");
    await pool.query("INSERT INTO geofences(id,created_by,name) VALUES(11,101,'G11'),(12,101,'Own V1'),(13,102,'Other'),(14,101,'Shared')");
        await pool.query("INSERT INTO geofence_vehicles(geofence_id,vehicle_id) VALUES(12,'V1'),(13,'V2'),(14,'V1'),(14,'V2')");
  });
  afterAll(async () => { await pool.end(); });

  it('denies foreign membership and permits assigned and admin fleet', async () => {
    expect(await assignVehicle(11, 'V2', assigned)).toBe(0);
    expect(await assignVehicle(11, 'V1', assigned)).toBe(1);
    expect(await assignVehicle(11, 'V1', assigned)).toBe(1);
    expect(await assignVehicle(11, 'V2', admin)).toBe(1);
    const list = await pool.query('SELECT vehicle_id FROM geofence_vehicles ORDER BY vehicle_id');
    expect(list.rows.map((r) => r.vehicle_id)).toEqual(['V1','V2']);
  });

  it('blocks removing another fleet membership while retaining admin rights', async () => {
    expect(await unassignVehicle(11, 'V2', assigned)).toBe(false);
    expect(await unassignVehicle(11, 'V2', admin)).toBe(true);
    expect(await assignVehicle(999, 'V1', assigned)).toBe(0);
  });

  it('restricts editing to the creator with grants for every linked vehicle', async () => {
    expect((await updateGeofence(12, { name: 'Own fleet edit' }, assigned))?.name).toBe('Own fleet edit');
    expect(await updateGeofence(13, { name: 'Foreign edit' }, assigned)).toBeNull();
    expect(await updateGeofence(14, { name: 'Shared edit' }, assigned)).toBeNull();
    expect((await updateGeofence(14, { name: 'Admin shared edit' }, admin))?.name).toBe('Admin shared edit');
    const foreign = await pool.query('SELECT name FROM geofences WHERE id=13');
    expect(foreign.rows[0].name).toBe('Other');
    expect(await updateGeofence(13, {}, assigned)).toBeNull();
  });
  it('revocation is enforced inside the subsequent membership SQL operation', async () => {
    await pool.query("DELETE FROM user_device_access WHERE user_id=101 AND device_id='D1'");
    expect(await assignVehicle(11, 'V1', assigned)).toBe(0);
    expect(await unassignVehicle(11, 'V1', assigned)).toBe(false);
    expect(await updateGeofence(12, { name: 'After revoke' }, assigned)).toBeNull();
    const row = await pool.query("SELECT count(*)::int AS total FROM geofence_vehicles WHERE vehicle_id='V1'");
    expect(row.rows[0].total).toBe(1);
    expect(await unassignVehicle(11, 'V1', admin)).toBe(true);
  });
});
