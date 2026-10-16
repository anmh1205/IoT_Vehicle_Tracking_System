import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
vi.mock('@/infrastructure/database/pool', async () => {
  const { Pool } = await import('pg');
  return { pool: new Pool({
    host: process.env.PGHOST ?? '127.0.0.1',
    port: Number(process.env.PGPORT ?? 5432),
    user: process.env.PGUSER ?? 'ivts_test',
    password: process.env.PGPASSWORD ?? 'ivts_test_password',
    database: process.env.PGDATABASE ?? 'ivts_test_asset_reads',
  }) };
});
import { pool } from '@/infrastructure/database/pool';
import * as trips from '@/domain/trip/repositories/trip.repository';
import * as maintenance from '@/domain/maintenance/repositories/maintenance.repository';

const integration = process.env.IVTS_PG_INTEGRATION === '1' ? describe : describe.skip;
const limited = { userId: 101, role: 'viewer', deviceAccessMode: 'assigned' };
const admin = { userId: 102, role: 'admin', deviceAccessMode: 'all' };

integration('trip and maintenance SQL grant scope against PostgreSQL', () => {
  beforeAll(async () => {
    if (process.env.PGDATABASE !== 'ivts_test_asset_reads') throw new Error('Unsafe database');
    await pool.query('CREATE TABLE user_device_access(user_id integer,device_id text)');
    await pool.query('CREATE TABLE customers(id integer PRIMARY KEY,name text)');
    await pool.query(`CREATE TABLE vehicles(
      id integer PRIMARY KEY,vehicle_id text UNIQUE,device_id text,
      customer_id integer,plate_number text
    )`);
    await pool.query(`CREATE TABLE trips(
      id integer PRIMARY KEY,trip_code text,device_id text,vehicle_id text,
      status text,created_at timestamptz DEFAULT NOW()
    )`);
    await pool.query(`CREATE TABLE maintenance(
      id integer PRIMARY KEY,vehicle_id text,status text,
      maintenance_type text,created_at timestamptz DEFAULT NOW()
    )`);
    await pool.query("INSERT INTO user_device_access VALUES(101,'D1')");
    await pool.query("INSERT INTO vehicles(id,vehicle_id,device_id) VALUES (1,'V1','D1'),(2,'V2','D2')");
    await pool.query(`INSERT INTO trips(id,trip_code,device_id,vehicle_id,status)
      VALUES(11,'ONE','D1','V1','planned'),
            (12,'TWO','D2','V2','planned'),
            (13,'CONFLICT','D1','V2','planned'),
            (14,'LEGACY',NULL,'V1','planned'),
            (15,'GLOBAL',NULL,NULL,'planned')`);
    await pool.query(`INSERT INTO maintenance(id,vehicle_id,status,maintenance_type)
      VALUES(21,'V1','scheduled','repair'),(22,'V2','scheduled','repair'),(23,NULL,'scheduled','repair')`);
  });
  afterAll(async () => { await pool.end(); });

  it('keeps assigned trip list, count and ID details within both device and vehicle grants', async () => {
    const list = await trips.findAll({}, limited);
    expect(list.trips.map(t => t.id).sort()).toEqual([11,14]);
    expect(list.total).toBe(2);
    expect(await trips.findByIdForScope(12, limited)).toBeNull();
    expect(await trips.findByIdForScope(13, limited)).toBeNull();
    expect(await trips.findByIdForScope(15, limited)).toBeNull();
    expect((await trips.findAll({ vehicleId: 'V2' }, limited)).total).toBe(0);
    expect((await trips.findAll({}, admin)).total).toBe(5);
  });

  it('filters maintenance list/ID and denies unassigned vehicle records', async () => {
    const list = await maintenance.findAll({}, limited);
    expect(list.records.map(m => m.id)).toEqual([21]);
    expect(list.total).toBe(1);
    expect(await maintenance.findByIdForScope(22, limited)).toBeNull();
    expect(await maintenance.findByIdForScope(23, limited)).toBeNull();
    expect((await maintenance.findAll({ vehicleId: 'V2' }, limited)).total).toBe(0);
    expect((await maintenance.findAll({}, admin)).total).toBe(3);
  });

  it('immediately revokes trip and maintenance reads after removal of device access', async () => {
    await pool.query("DELETE FROM user_device_access WHERE user_id=101");
    expect((await trips.findAll({}, limited)).total).toBe(0);
    expect((await maintenance.findAll({}, limited)).total).toBe(0);
    expect(await trips.findByIdForScope(11, limited)).toBeNull();
    expect(await maintenance.findByIdForScope(21, limited)).toBeNull();
  });
});