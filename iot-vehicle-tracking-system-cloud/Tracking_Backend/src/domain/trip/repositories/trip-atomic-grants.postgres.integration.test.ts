import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';

// One PostgreSQL session keeps temporary fixture tables isolated from other
// CI integration suites sharing the same database.
vi.mock('@/infrastructure/database/pool', async () => {
  const { Client } = await import('pg');
  return {
    pool: new Client({
      host: process.env.PGHOST ?? '127.0.0.1',
      port: Number(process.env.PGPORT ?? '5432'),
      user: process.env.PGUSER ?? 'ivts_test',
      password: process.env.PGPASSWORD ?? 'ivts_test_password',
      database: process.env.PGDATABASE ?? 'ivts_test_assets',
    }),
  };
});

import { pool } from '@/infrastructure/database/pool';
import { update, startTrip, endTrip, endTripWithStats } from './trip.repository';

const integration = process.env.IVTS_PG_INTEGRATION === '1' ? describe : describe.skip;
const u1 = { userId: 101, role: 'operator', deviceAccessMode: 'assigned' };
const admin = { userId: 1, role: 'admin', deviceAccessMode: 'all' };

integration('atomic trip lifecycle and device grants in actual PostgreSQL', () => {
  beforeAll(async () => {
    if (process.env.PGDATABASE !== 'ivts_test_assets') throw new Error('Unsafe trip fixture database');
    await pool.connect();
    await pool.query('CREATE TEMP TABLE user_device_access(user_id integer,device_id text)');
    await pool.query('CREATE TEMP TABLE vehicles(vehicle_id text,device_id text)');
    await pool.query(`CREATE TEMP TABLE trips(
      id integer PRIMARY KEY, vehicle_id text, device_id text, status text, notes text,
      actual_start timestamptz, actual_end timestamptz, updated_at timestamptz,
      distance_km numeric, start_latitude numeric, start_longitude numeric,
      end_latitude numeric, end_longitude numeric
    )`);
    await pool.query("INSERT INTO user_device_access VALUES (101,'D1'), (102,'D2')");
    await pool.query("INSERT INTO vehicles VALUES ('V1','D1'), ('V2','D2')");
    await pool.query(`INSERT INTO trips(id,vehicle_id,device_id,status,actual_start) VALUES
      (11,'V1','D1','planned',NULL),
      (12,'V2','D2','planned',NULL),
      (13,'V1','D1','in_progress',NOW()),
      (14,'V1','D1','in_progress',NOW())`);
  });
  afterAll(async () => { await pool.end(); });

  it('rejects cross-fleet edits while accepting authorized and admin writes', async () => {
    expect(await update(12, { notes: 'cross-fleet' }, u1)).toBeNull();
    expect((await pool.query('SELECT notes FROM trips WHERE id=12')).rows[0].notes).toBeNull();
    expect((await update(11, { notes: 'authorized' }, u1))?.notes).toBe('authorized');
    expect((await update(12, { notes: 'admin' }, admin))?.notes).toBe('admin');
  });

  it('permits only a granted planned trip to start, once', async () => {
    expect(await startTrip(12, u1)).toBeNull();
    expect((await startTrip(11, u1))?.status).toBe('in_progress');
    expect(await startTrip(11, u1)).toBeNull();
  });

  it('enforces grants and state when ending a trip or computing route stats', async () => {
    expect(await endTrip(12, u1)).toBeNull();
    expect((await endTrip(13, u1))?.status).toBe('completed');
    expect(await endTrip(13, u1)).toBeNull();
    const stats = { distanceKm: 5.5, startLatitude: 10.2, startLongitude: 106.3,
      endLatitude: 10.4, endLongitude: 106.5 };
    const ended = await endTripWithStats(14, stats, u1);
    expect(ended?.status).toBe('completed');
    expect(Number(ended?.distance_km)).toBe(5.5);
    expect(await endTripWithStats(14, stats, u1)).toBeNull();
  });

  it('honors immediate grant revocation for all later writes', async () => {
    await pool.query("DELETE FROM user_device_access WHERE user_id=101 AND device_id='D1'");
    expect(await update(11, { notes: 'after-revocation' }, u1)).toBeNull();
    expect(await startTrip(11, u1)).toBeNull();
    expect(await endTrip(11, u1)).toBeNull();
    const row = await pool.query('SELECT notes,status FROM trips WHERE id=11');
    expect(row.rows[0]).toMatchObject({ notes: 'authorized', status: 'in_progress' });
  });
});
