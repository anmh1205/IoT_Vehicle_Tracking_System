import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';

vi.mock('@/infrastructure/database/pool', async () => {
  const { Pool } = await import('pg');
  return {
    pool: new Pool({
      host: process.env.PGHOST || '127.0.0.1',
      port: Number(process.env.PGPORT || '5432'),
      user: process.env.PGUSER || 'ivts_test',
      password: process.env.PGPASSWORD || 'ivts_test_password',
      database: process.env.PGDATABASE || 'ivts_test_alerts',
    }),
  };
});

import { pool } from '@/infrastructure/database/pool';
import { findAll, findByIdForScope } from './alert.repository';

const integration = process.env.IVTS_PG_INTEGRATION === '1' ? describe : describe.skip;
const viewer = { userId: 101, role: 'viewer', deviceAccessMode: 'assigned' };
const admin = { userId: 102, role: 'admin', deviceAccessMode: 'all' };

integration('alert REST repository grant isolation with real PostgreSQL', () => {
  beforeAll(async () => {
    if (process.env.PGDATABASE !== 'ivts_test_alerts') {
      throw new Error('Refusing integration write outside isolated ivts_test_alerts');
    }
    await pool.query('CREATE TABLE devices(device_id text PRIMARY KEY,device_name text, vehicle_id text)');
    await pool.query('CREATE TABLE customers(id integer PRIMARY KEY,name text)');
    await pool.query(`CREATE TABLE vehicles(id integer PRIMARY KEY,vehicle_id text UNIQUE,device_id text,plate_number text,customer_id integer,updated_at timestamptz)`);
    await pool.query('CREATE TABLE trips(id bigint PRIMARY KEY,trip_code text)');
    await pool.query('CREATE TABLE geofences(id integer PRIMARY KEY,name text)');
    await pool.query(`CREATE TABLE alerts(
      id bigint PRIMARY KEY, vehicle_id text, device_id text, trip_id bigint,
      geofence_id integer, alert_type text, source text, severity text,
      status text, title text, message text, created_at timestamptz DEFAULT now())`);
    await pool.query('CREATE TABLE user_device_access(user_id integer,device_id text)');
    await pool.query(`INSERT INTO devices(device_id,device_name) VALUES('D1','ONE'),('D2','TWO')`);
    await pool.query(`INSERT INTO vehicles(id,vehicle_id,device_id,plate_number,updated_at)
      VALUES(1,'V1','D1','ONE-PLATE',NOW()),(2,'V2','D2','TWO-PLATE',NOW())`);
    await pool.query(`INSERT INTO alerts(id,vehicle_id,device_id,alert_type,source,severity,status,title)
      VALUES (1,NULL,'D1','motion','device','medium','active','D1'),
             (2,NULL,'D2','motion','device','medium','active','D2'),
             (3,'V1',NULL,'geofence','device','medium','active','V1'),
             (4,NULL,NULL,'system','system','medium','active','GLOBAL')`);
    await pool.query(`INSERT INTO user_device_access(user_id,device_id) VALUES(101,'D1')`);
  });
  afterAll(async () => { await pool.end(); });

  it('enforces grants on list, list count, explicit device filter and alert detail', async () => {
    const list = await findAll({}, viewer);
    expect(list.alerts.map(a => Number(a.id)).sort()).toEqual([1,3]);
    expect(list.total).toBe(2);
    expect((await findAll({ deviceId:'D2' }, viewer)).total).toBe(0);
    expect(await findByIdForScope(2,viewer)).toBeNull();
    expect(await findByIdForScope(4,viewer)).toBeNull();
    expect(Number((await findByIdForScope(3,viewer))?.id)).toBe(3);
    expect((await findAll({},admin)).total).toBe(4);
  });

  it('revokes access immediately when device grant is changed', async () => {
    await pool.query("DELETE FROM user_device_access WHERE user_id=101 AND device_id='D1'");
    expect((await findAll({}, viewer)).total).toBe(0);
    expect(await findByIdForScope(1, viewer)).toBeNull();
    await pool.query("INSERT INTO user_device_access(user_id,device_id) VALUES(101,'D2')");
    expect((await findAll({},viewer)).alerts.map(a=>Number(a.id))).toEqual([2]);
  });
});
