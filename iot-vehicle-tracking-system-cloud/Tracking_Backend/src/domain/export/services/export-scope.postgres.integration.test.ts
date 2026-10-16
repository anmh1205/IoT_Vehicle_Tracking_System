import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Pool } from 'pg';
import ExcelJS from 'exceljs';
import { rm } from 'node:fs/promises';

vi.mock('@/infrastructure/database/pool', async () => {
  const { Pool } = await import('pg');
  return {
    pool: new Pool({
      host: process.env.PGHOST ?? '127.0.0.1',
      port: Number(process.env.PGPORT ?? '5432'),
      user: process.env.PGUSER ?? 'ivts_test',
      password: process.env.PGPASSWORD ?? 'ivts_test_password',
      database: process.env.PGDATABASE ?? 'ivts_test_exports',
      // Isolate this test from concurrent export job tests in the same CI DB.
      options: '-c search_path=ivts_export_scope_test',
    }),
  };
});
vi.mock('@/infrastructure/logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

import { pool as scopedPool } from '@/infrastructure/database/pool';
import { generateExcelFile } from './export-file.service';

const integration = process.env.IVTS_PG_INTEGRATION === '1' ? describe : describe.skip;
integration('live PostgreSQL device-scoped XLSX row isolation', () => {
  const admin = new Pool({
    host: process.env.PGHOST ?? '127.0.0.1',
    port: Number(process.env.PGPORT ?? '5432'),
    user: process.env.PGUSER ?? 'ivts_test',
    password: process.env.PGPASSWORD ?? 'ivts_test_password',
    database: process.env.PGDATABASE ?? 'ivts_test_exports',
  });
  const generated: string[] = [];
  const deviceColumns = [
    'id', 'device_id', 'device_name', 'current_status',
    'imei', 'firmware_version', 'imu_accel_delta_threshold_mps2',
    'request_interval', 'latitude', 'longitude', 'last_seen_at', 'created_at',
  ];

  beforeAll(async () => {
    if (process.env.PGDATABASE !== 'ivts_test_exports') {
      throw new Error('Refusing scoped export test writes outside isolated CI DB');
    }
    await admin.query('CREATE SCHEMA ivts_export_scope_test');
    await scopedPool.query(`CREATE TABLE users (
      id integer PRIMARY KEY, role text NOT NULL, status text NOT NULL
    )`);
    await scopedPool.query(`CREATE TABLE user_device_access (
      user_id integer NOT NULL, device_id text NOT NULL
    )`);
    await scopedPool.query(`CREATE TABLE devices (
      id bigint PRIMARY KEY,
      device_id text NOT NULL,
      device_name text,
      current_status text,
      imei text,
      firmware_version text,
      imu_accel_delta_threshold_mps2 double precision,
      request_interval integer,
      latitude double precision,
      longitude double precision,
      last_seen_at timestamptz,
      created_at timestamptz DEFAULT NOW()
    )`);
    await scopedPool.query(`INSERT INTO users(id,role,status)
      VALUES (4,'manager','active'), (5,'viewer','active'), (6,'operator','disabled')`);
    await scopedPool.query(`INSERT INTO user_device_access(user_id,device_id)
      VALUES (4,'D1'), (5,'D1'), (6,'D1')`);
    await scopedPool.query(`INSERT INTO devices(id, device_id, device_name)
      VALUES (1,'D1','Assigned device'), (2,'D2','Forbidden device')`);
  });

  afterAll(async () => {
    for (const file of generated) await rm(file, { force: true });
    await scopedPool.end();
    try { await admin.query('DROP SCHEMA IF EXISTS ivts_export_scope_test CASCADE'); }
    finally { await admin.end(); }
  });

  const rowsFor = async (deviceId: string, userId: number, jobId: number): Promise<unknown[][]> => {
    const output = await generateExcelFile('devices', jobId, { deviceId, userId });
    generated.push(output);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(output);
    const sheet = workbook.getWorksheet('Devices');
    expect(sheet).toBeDefined();
    // Row 1 is the header. Read all emitted rows from the actual XLSX file.
    const data: unknown[][] = [];
    sheet!.eachRow((row, rowIndex) => {
      if (rowIndex > 1) {
        data.push(deviceColumns.map((_, index) => row.getCell(index + 1).value));
      }
    });
    return data;
  };

  it('exports only granted D1, never another device in the same fleet', async () => {
    const rows = await rowsFor('D1', 4, 310101);
    expect(rows).toHaveLength(1);
    expect(rows[0][1]).toBe('D1');
    expect(rows[0][2]).toBe('Assigned device');
    expect(rows.some((row) => row[1] === 'D2')).toBe(false);
  });

  it('rejects rows of a device not granted to that manager', async () => {
    const rows = await rowsFor('D2', 4, 310102);
    expect(rows).toHaveLength(0);
  });

  it('after current SQL grant revocation returns no rows, even with old job scope', async () => {
    await scopedPool.query('DELETE FROM user_device_access WHERE user_id = 4');
    const rows = await rowsFor('D1', 4, 310103);
    expect(rows).toHaveLength(0);
  });

  it('also denies viewer role and disabled operator regardless of matching grant', async () => {
    expect(await rowsFor('D1', 5, 310104)).toHaveLength(0);
    expect(await rowsFor('D1', 6, 310105)).toHaveLength(0);
  });
});
