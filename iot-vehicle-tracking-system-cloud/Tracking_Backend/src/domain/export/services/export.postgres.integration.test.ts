import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
vi.mock('@/infrastructure/database/pool', async () => {
  const { Pool } = await import('pg');
  return { pool: new Pool({
    host: process.env.PGHOST ?? '127.0.0.1',
    port: Number(process.env.PGPORT ?? '5432'),
    user: process.env.PGUSER ?? 'ivts_test',
    password: process.env.PGPASSWORD ?? 'ivts_test_password',
    database: process.env.PGDATABASE ?? 'ivts_test_exports',
  }) };
});
vi.mock('@/infrastructure/logger', () => ({
  createLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));
vi.mock('@/infrastructure/realtime', () => ({ publishEvent: vi.fn() }));
vi.mock('@/domain/export/services/export-file.service', () => ({
  generateExcelFile: vi.fn(async (_type: string, id: number) => `/tmp/ivts-test-export-${id}.xlsx`),
  isSupportedExportType: (type: string) => ['devices','vehicles','trips','alerts','maintenance'].includes(type),
}));
import { pool } from '@/infrastructure/database/pool';
import { processExport } from './export-processing.service';
import { generateExcelFile } from './export-file.service';
import * as repository from '../repositories/export.repository';

const integration = process.env.IVTS_PG_INTEGRATION === '1' ? describe : describe.skip;
integration('durable export recovery and global scope against PostgreSQL', () => {
  beforeAll(async () => {
    if (process.env.PGDATABASE !== 'ivts_test_exports') {
      throw new Error('Refusing write outside isolated export test database');
    }
    await pool.query('CREATE TABLE users(id integer PRIMARY KEY, role text, status text)');
    await pool.query(`CREATE TABLE export_jobs(
      id integer PRIMARY KEY, user_id integer, export_type text,
      status text, filters jsonb, file_path text,
      created_at timestamptz DEFAULT now(), completed_at timestamptz
    )`);
    await pool.query(`INSERT INTO users(id,role,status) VALUES
      (1,'admin','active'),(2,'operator','active'),(3,'root','disabled')`);
    await pool.query(`INSERT INTO export_jobs(id,user_id,export_type,status)
      VALUES (11,1,'vehicles','pending'),(12,1,'alerts','processing'),
             (13,2,'devices','pending'),(14,3,'trips','pending')`);
  });
  afterAll(async () => { await pool.end(); });

  it('uses session-scoped database lease to prevent duplicate concurrent full-fleet work', async () => {
    const current = (await repository.findById(11))!;
    expect(current.status).toBe('pending');
    await Promise.all([processExport(current), processExport(current)]);
    expect((await repository.findById(11))?.status).toBe('completed');
    expect(vi.mocked(generateExcelFile).mock.calls.filter((args) => args[1] === 11)).toHaveLength(1);
  });

  it('reclaims a database processing row abandoned by previous process', async () => {
    const unfinished = await repository.findRecoverable();
    expect(unfinished.map((j) => j.id)).toContain(12);
    await processExport(unfinished.find((j) => j.id === 12)!);
    expect((await repository.findById(12))?.status).toBe('completed');
  });

  it('fails closed if queued owner was demoted or disabled before job execution', async () => {
    for (const id of [13, 14]) {
      const j = (await repository.findById(id))!;
      await processExport(j);
      expect((await repository.findById(id))?.status).toBe('failed');
      expect(vi.mocked(generateExcelFile).mock.calls.some((call) => call[1] === id)).toBe(false);
    }
  });

  it('a completed job is never reprocessed by a later recovery scan', async () => {
    const oldCalls = vi.mocked(generateExcelFile).mock.calls.length;
    await processExport((await repository.findById(11))!);
    expect(vi.mocked(generateExcelFile).mock.calls.length).toBe(oldCalls);
    expect(await repository.findRecoverable()).toEqual([]);
  });
});