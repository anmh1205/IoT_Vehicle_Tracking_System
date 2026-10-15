import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';

vi.mock('@/infrastructure/database/pool', async () => {
  const { Pool } = await import('pg');
  return {
    pool: new Pool({
      host: process.env.PGHOST ?? '127.0.0.1',
      port: Number(process.env.PGPORT ?? '5432'),
      user: process.env.PGUSER ?? 'ivts_test',
      password: process.env.PGPASSWORD ?? 'ivts_test_password',
      database: process.env.PGDATABASE ?? 'ivts_test_dashboard',
    }),
  };
});

import { pool } from '@/infrastructure/database/pool';
import * as repository from './dashboard.repository';

const integration = process.env.IVTS_PG_INTEGRATION === '1' ? describe : describe.skip;
const limited = { userId: 101, role: 'viewer', deviceAccessMode: 'assigned' };
const admin = { userId: 102, role: 'admin', deviceAccessMode: 'all' };

integration('all dashboard endpoints restrict assigned fleet data in real PostgreSQL', () => {
  beforeAll(async () => {
    if (process.env.PGDATABASE !== 'ivts_test_dashboard') {
      throw new Error('Refusing test writes outside isolated ivts_test_dashboard');
    }
    await pool.query('CREATE TABLE user_device_access(user_id integer, device_id text)');
    await pool.query('CREATE TABLE devices(device_id text PRIMARY KEY, current_status text)');
    await pool.query('CREATE TABLE vehicles(vehicle_id text PRIMARY KEY, device_id text)');
    await pool.query(`CREATE TABLE device_sessions(
      id serial PRIMARY KEY, device_id text, server_session_start timestamptz,
      server_session_end timestamptz, created_at timestamptz DEFAULT NOW(),
      uptime integer
    )`);
    await pool.query('CREATE TABLE alerts(id integer PRIMARY KEY,device_id text,vehicle_id text,status text)');
    await pool.query(`CREATE TABLE event_logs(id integer PRIMARY KEY,device_id text,correlation_id text,
      event_type text,event_code text,severity text,message text,server_timestamp timestamptz)`);
    await pool.query(`INSERT INTO user_device_access(user_id,device_id) VALUES(101,'D1')`);
    await pool.query(`INSERT INTO devices(device_id,current_status) VALUES('D1','running'),('D2','stopped')`);
    await pool.query(`INSERT INTO vehicles(vehicle_id,device_id) VALUES('V1','D1'),('V2','D2')`);
    await pool.query(`INSERT INTO device_sessions(device_id,server_session_start,uptime)
      VALUES ('D1',NOW(),1800),('D2',NOW(),3600)`);
    await pool.query(`INSERT INTO alerts(id,device_id,status) VALUES(1,'D1','active'),(2,'D2','active')`);
    await pool.query(`INSERT INTO event_logs(id,device_id,correlation_id,event_type,event_code,severity,message,server_timestamp)
      VALUES(1,'D1','c1','motion','MOTION','info','motion',NOW()),
            (2,'D2','c2','motion','MOTION','info','motion',NOW())`);
  });

  afterAll(async () => { await pool.end(); });

  it('scopes status, runtime, sessions, alerts and event pagination', async () => {
    expect(await repository.getDeviceStatusCounts(limited)).toEqual({ running: 1 });
    expect(await repository.getTotalRuntimeToday(limited)).toBe(1800);
    expect(await repository.getTotalRuntimeWeek(limited)).toBe(1800);
    expect(await repository.getActiveAlertsCount(limited)).toBe(1);
    expect(await repository.getSessionsToday(limited)).toBe(1);
    const recent = await repository.getActivityEvents({},limited);
    expect(recent.total).toBe(1);
    expect(recent.events.map(event=>event.device_id)).toEqual(['D1']);
    expect((await repository.getActivityEvents({ deviceId:'D2' },limited)).total).toBe(0);

    expect((await repository.getDeviceStatusDistribution(limited)).reduce((n, row)=>n+Number(row.count),0)).toBe(1);
    const activity = await repository.getDeviceActivitySeries(1,limited);
    expect(activity.reduce((n,row)=>n+Number(row.running)+Number(row.idle)+Number(row.offline),0)).toBe(1);
    const runtime = await repository.getFleetRuntimeSeries(1,limited);
    expect(runtime.reduce((n,row)=>n+Number(row.runtime_hours),0)).toBe(0.5);
    expect(await repository.getActiveAlertsCount(admin)).toBe(2);
    expect((await repository.getActivityEvents({},admin)).total).toBe(2);
  });

  it('takes away dashboard visibility immediately when grants are revoked', async () => {
    await pool.query("DELETE FROM user_device_access WHERE user_id=101");
    expect(await repository.getDeviceStatusCounts(limited)).toEqual({});
    expect(await repository.getSessionsToday(limited)).toBe(0);
    expect(await repository.getActiveAlertsCount(limited)).toBe(0);
    expect((await repository.getActivityEvents({},limited)).total).toBe(0);
    const runtime = await repository.getFleetRuntimeSeries(1,limited);
    expect(runtime.reduce((n,row)=>n+Number(row.runtime_hours),0)).toBe(0);
  });
});
