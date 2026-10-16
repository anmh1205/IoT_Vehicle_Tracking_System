import { describe, beforeEach, expect, it, vi } from 'vitest';

vi.mock('@/domain/export/repositories/export.repository', () => ({
  create: vi.fn(),
  findAll: vi.fn(),
  findById: vi.fn(),
  hasActiveDeviceGrantOwner: vi.fn(),
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
import {
  createExport, createScopedDeviceExport, getScopedDeviceExportStatus,
  getScopedDeviceExportDownload,
} from './export-job.service';

describe('export-job supported-type contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(processExport).mockResolvedValue(undefined);
    vi.mocked(isSupportedExportType).mockImplementation((type) => type === 'devices');
  });

  it('rejects the unimplemented telemetry export synchronously and creates no job', async () => {
    await expect(createExport(1, { exportType: 'telemetry' })).rejects.toMatchObject({
      status: 400,
    });
    expect(exportRepo.create).not.toHaveBeenCalled();
    expect(processExport).not.toHaveBeenCalled();
  });

  it('rejects unsupported device/date/format filters rather than exporting an unscoped fleet', async () => {
    await expect(createExport(1, {
      exportType: 'devices',
      filters: { deviceId: 'D1', from: '2026-01-01', format: 'csv' },
    })).rejects.toMatchObject({ status: 400 });
    await expect(createExport(1, { exportType: 'devices', filters: {} })).rejects.toMatchObject({ status: 400 });
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


describe('scoped device export authorization', () => {
  const scopedJob = {
    id: 75,
    user_id: 2,
    export_type: 'devices',
    status: 'completed' as const,
    filters: { deviceId: 'D1' },
    file_path: '/tmp/device_75.xlsx',
    created_at: new Date('2026-10-15T00:00:00Z'),
    completed_at: new Date('2026-10-15T00:01:00Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(processExport).mockResolvedValue(undefined);
    vi.mocked(exportRepo.hasActiveDeviceGrantOwner).mockResolvedValue(true);
    vi.mocked(exportRepo.create).mockResolvedValue(scopedJob);
    vi.mocked(exportRepo.findById).mockResolvedValue(scopedJob);
  });

  it('denies missing grant, invalid identity and extra scope without creating a job', async () => {
    await expect(createScopedDeviceExport(2, { deviceId: '../D2' }))
      .rejects.toMatchObject({ status: 400 });
    await expect(createScopedDeviceExport(2, { deviceId: '' }))
      .rejects.toMatchObject({ status: 400 });
    vi.mocked(exportRepo.hasActiveDeviceGrantOwner).mockResolvedValue(false);
    await expect(createScopedDeviceExport(2, { deviceId: 'D2' }))
      .rejects.toMatchObject({ status: 403 });
    expect(exportRepo.create).not.toHaveBeenCalled();
  });

  it('writes canonical one-device filter after checking current grant', async () => {
    const created = await createScopedDeviceExport(2, { deviceId: 'D1' });
    expect(exportRepo.hasActiveDeviceGrantOwner).toHaveBeenCalledWith(2, 'D1');
    expect(exportRepo.create).toHaveBeenCalledWith(2, {
      exportType: 'devices', filters: { deviceId: 'D1' },
    });
    expect(processExport).toHaveBeenCalledWith(scopedJob);
    expect(created.filePath).toBeNull();
  });

  it('checks the current grant and ownership again before revealing status or file', async () => {
    const visible = await getScopedDeviceExportStatus(75, 2);
    expect(visible.filePath).toBeNull();
    const download = await getScopedDeviceExportDownload(75, 2);
    expect(download.path).toBe(scopedJob.file_path);

    vi.mocked(exportRepo.hasActiveDeviceGrantOwner).mockResolvedValue(false);
    await expect(getScopedDeviceExportStatus(75, 2))
      .rejects.toMatchObject({ status: 403 });
    await expect(getScopedDeviceExportDownload(75, 2))
      .rejects.toMatchObject({ status: 403 });

    vi.mocked(exportRepo.findById).mockResolvedValue({ ...scopedJob, user_id: 99 });
    await expect(getScopedDeviceExportStatus(75, 2))
      .rejects.toMatchObject({ status: 404 });
  });

  it('cannot reinterpret an unscoped administrator job as a scoped device export', async () => {
    vi.mocked(exportRepo.findById).mockResolvedValue({ ...scopedJob, filters: null });
    await expect(getScopedDeviceExportStatus(75, 2))
      .rejects.toMatchObject({ status: 404 });
  });
});
