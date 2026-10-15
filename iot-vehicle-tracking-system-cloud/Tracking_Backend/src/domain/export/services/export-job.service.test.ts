import { describe, beforeEach, expect, it, vi } from 'vitest';

vi.mock('@/domain/export/repositories/export.repository', () => ({
  create: vi.fn(),
  findAll: vi.fn(),
  findById: vi.fn(),
}));
vi.mock('@/domain/export/services/export-processing.service', () => ({
  processExport: vi.fn(),
}));
vi.mock('@/domain/export/services/export-file.service', () => ({
  isSupportedExportType: vi.fn((type: string) => type === 'devices'),
}));

import * as exportRepo from '@/domain/export/repositories/export.repository';
import { processExport } from '@/domain/export/services/export-processing.service';
import { isSupportedExportType } from '@/domain/export/services/export-file.service';
import { createExport } from './export-job.service';

describe('export-job supported-type contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isSupportedExportType).mockImplementation((type) => type === 'devices');
  });

  it('rejects the unimplemented telemetry export synchronously and creates no job', async () => {
    await expect(createExport(1, { exportType: 'telemetry' })).rejects.toMatchObject({
      status: 400,
    });
    expect(exportRepo.create).not.toHaveBeenCalled();
    expect(processExport).not.toHaveBeenCalled();
  });

  it('accepts a supported export type for the existing job processor', async () => {
    const job = {
      id: 51,
      user_id: 1,
      export_type: 'devices',
      status: 'pending' as const,
      filters: null,
      file_path: null,
      created_at: new Date('2026-10-15T00:00:00Z'),
      completed_at: null,
    };
    vi.mocked(exportRepo.create).mockResolvedValue(job);

    const result = await createExport(1, { exportType: 'devices' });
    expect(result).toMatchObject({ id: 51, exportType: 'devices', status: 'pending' });
    expect(exportRepo.create).toHaveBeenCalledOnce();
    expect(processExport).toHaveBeenCalledWith(job);
  });
});
