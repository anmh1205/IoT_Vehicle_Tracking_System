import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import ExcelJS from 'exceljs';

vi.mock('@/infrastructure/database/queries', () => ({
  findMany: vi.fn(),
}));
import { findMany } from '@/infrastructure/database/queries';
import { EXPORT_MAX_ROWS, EXPORT_PAGE_SIZE, generateExcelFile } from './export-file.service';

const exportedDir = path.resolve(process.cwd(), 'exports');
const generated: string[] = [];

afterEach(async () => {
  vi.mocked(findMany).mockReset();
  await Promise.all(generated.splice(0).map((file) => rm(file, { force: true })));
});

describe('bounded streaming full-fleet exports', () => {
  it('produces a workbook using a limited indexed SQL query without all-rows buffering', async () => {
    vi.mocked(findMany).mockResolvedValueOnce([
      { id: 9, vehicle_id: 'V9', device_id: 'D9', created_at: new Date('2026-10-15T01:00:00Z') },
      { id: 7, vehicle_id: 'V7', device_id: 'D7', created_at: new Date('2026-10-14T01:00:00Z') },
    ] as never);

    const filename = await generateExcelFile('vehicles', 915);
    generated.push(filename);
    expect(path.dirname(filename)).toBe(exportedDir);
    const [sql, params] = vi.mocked(findMany).mock.calls[0];
    expect(sql).toContain('WHERE id < $1 ORDER BY id DESC LIMIT $2');
    expect(params).toEqual(['9223372036854775807', EXPORT_PAGE_SIZE]);
    expect(await readFile(filename)).not.toHaveLength(0);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filename);
    const rows = workbook.getWorksheet('Vehicles')!;
    expect(rows.getRow(2).getCell('vehicleId').value).toBe('V9');
    expect(rows.getRow(3).getCell('vehicleId').value).toBe('V7');
  });

  it('fails instead of silently truncating a fleet larger than safety limit', async () => {
    let nextId = EXPORT_MAX_ROWS + 3;
    vi.mocked(findMany).mockImplementation(async (_sql, params) => {
      const count = Number(params?.[1] ?? 0);
      const result = [];
      for (let i = 0; i < count; i++) {
        result.push({ id: nextId, vehicle_id: 'V' + nextId, device_id: 'D' + nextId });
        nextId--;
      }
      return result;
    });

    const before = (await readdir(exportedDir).catch(() => []))
      .filter((item) => item.startsWith('vehicles_916_'));
    await expect(generateExcelFile('vehicles', 916)).rejects.toThrow(
      'Export exceeds the 10000 row safety limit',
    );
    const after = (await readdir(exportedDir))
      .filter((item) => item.startsWith('vehicles_916_'));
    expect(after).toEqual(before);
    expect(vi.mocked(findMany).mock.calls.at(-1)?.[1]?.[1]).toBe(1);
  });

  it('refuses unsupported table names before creating a workbook', async () => {
    await expect(generateExcelFile('secrets', 918)).rejects.toThrow('Unsupported export type');
    expect(findMany).not.toHaveBeenCalled();
  });
});
