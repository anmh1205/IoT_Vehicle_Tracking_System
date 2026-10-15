import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';

vi.mock('@/infrastructure/database/pool', async () => {
  const { Pool } = await import('pg');
  return {
    pool: new Pool({
      host: process.env.PGHOST ?? '127.0.0.1',
      port: Number(process.env.PGPORT ?? '5432'),
      user: process.env.PGUSER ?? 'ivts_test',
      password: process.env.PGPASSWORD ?? 'ivts_test_password',
      database: process.env.PGDATABASE ?? 'ivts_test_vehicles',
    }),
  };
});
import { pool } from '@/infrastructure/database/pool';
import { findAll, findByIdForScope } from './vehicle.repository';

const integration = process.env.IVTS_PG_INTEGRATION === '1' ? describe : describe.skip;
const limited = { userId: 101, role: 'viewer', deviceAccessMode: 'assigned' };
const admin = { userId: 102, role: 'admin', deviceAccessMode: 'all' };

integration('vehicle REST grants on real PostgreSQL', () => {
  beforeAll(async () => {
    if (process.env.PGDATABASE !== 'ivts_test_vehicles') {
      throw new Error('Refusing write to non-isolated PostgreSQL database');
    }
    await pool.query('CREATE TABLE user_device_access(user_id integer, device_id text)');
    await pool.query('CREATE TABLE customers(id integer PRIMARY KEY, customer_code text, name text)');
    await pool.query(`CREATE TABLE vehicles(
      id integer PRIMARY KEY, vehicle_id text, device_id text,
      customer_id integer, status text, plate_number text, brand text,
      created_at timestamptz DEFAULT NOW(), updated_at timestamptz DEFAULT NOW()
    )`);
    await pool.query("INSERT INTO user_device_access(user_id,device_id) VALUES(101,'D1')");
    await pool.query(`INSERT INTO vehicles(id,vehicle_id,device_id,status,plate_number,brand)
      VALUES(1,'V1','D1','active','ONE','A'),
            (2,'V2','D2','active','TWO','B'),
            (3,'V3',NULL,'active','UNASSIGNED','C')`);
  });
  afterAll(async () => { await pool.end(); });

  it('limits list, count, searched list and guessed ID detail by live grants', async () => {
    const listed = await findAll({}, limited);
    expect(listed.total).toBe(1);
    expect(listed.vehicles.map(v => v.vehicle_id)).toEqual(['V1']);
    expect((await findAll({ search: 'TWO' }, limited)).total).toBe(0);
    expect((await findAll({ status: 'active' }, limited)).total).toBe(1);
    expect((await findByIdForScope(1, limited))?.vehicle_id).toBe('V1');
    expect(await findByIdForScope(2, limited)).toBeNull();
    expect(await findByIdForScope(3, limited)).toBeNull();
    expect((await findAll({}, admin)).total).toBe(3);
    expect((await findByIdForScope(3, admin))?.vehicle_id).toBe('V3');
  });

  it('drops revoked devices from list and detail on subsequent queries', async () => {
    await pool.query("DELETE FROM user_device_access WHERE user_id=101");
    expect((await findAll({}, limited)).total).toBe(0);
    expect(await findByIdForScope(1, limited)).toBeNull();
  });
});
