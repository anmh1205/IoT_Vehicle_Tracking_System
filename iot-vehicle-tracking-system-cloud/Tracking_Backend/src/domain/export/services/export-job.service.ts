import * as exportRepo from '@/domain/export/repositories/export.repository';
import { processExport } from '@/domain/export/services/export-processing.service';
import { createLogger } from '@/infrastructure/logger';

const log = createLogger('export-job');
import { isSupportedExportType } from '@/domain/export/services/export-file.service';
import type {
  ExportJob,
  ExportJobPublic,
  CreateExportInput,
} from '@/domain/export/types/export.types';
import { createNotFoundError, createForbiddenError, createValidationError } from '@/shared/utils/errors.util';
import { isUndefinedTableError } from '@/shared/utils/postgres-error.util';

const sanitizeExportJob = (job: ExportJob): ExportJobPublic => ({
  id: job.id,
  exportType: job.export_type,
  status: job.status,
  filters: job.filters,
  filePath: job.file_path,
  createdAt: job.created_at.toISOString(),
  completedAt: job.completed_at?.toISOString() ?? null,
});

export const listExports = async (userId: number): Promise<ExportJobPublic[]> => {
  let jobs: ExportJob[];
  try {
    jobs = await exportRepo.findAll(userId);
  } catch (error) {
    if (isUndefinedTableError(error)) {
      return [];
    }
    throw error;
  }

  return jobs.map(sanitizeExportJob);
};

export const createExport = async (
  userId: number,
  input: CreateExportInput,
): Promise<ExportJobPublic> => {
  if (!isSupportedExportType(input.exportType)) {
    throw createValidationError('Unsupported export type: ' + input.exportType);
  }

  // All supported export SQL currently selects the full fleet. Reject any
  // requested device/date/format scope instead of silently exporting more
  // personal or location data than the operator explicitly selected.
  if (input.filters != null) {
    throw createValidationError('Filtered exports are not supported. Request an unfiltered Excel export explicitly.');
  }

  let job: ExportJob;
  try {
    job = await exportRepo.create(userId, input);
  } catch (error) {
    if (isUndefinedTableError(error)) {
      throw createNotFoundError('Export storage is not initialized');
    }
    throw error;
  }

  // Trigger async processing (fire-and-forget)
  void processExport(job).catch((error: unknown) => {
    log.error('Unhandled export job processing failure', { jobId: job.id, error });
  });

  return sanitizeExportJob(job);
};

export const getExportStatus = async (id: number, userId: number): Promise<ExportJobPublic> => {
  let job: ExportJob | null;
  try {
    job = await exportRepo.findById(id);
  } catch (error) {
    if (isUndefinedTableError(error)) {
      throw createNotFoundError('Export storage is not initialized');
    }
    throw error;
  }

  if (!job) throw createNotFoundError('Export job not found');
  if (job.user_id !== userId) throw createForbiddenError('Access denied to this export job');
  return sanitizeExportJob(job);
};

/** Recover work after unclean process death without overloading the database.
 * The per-job advisory lock in processExport coordinates multiple backends. */
const EXPORT_RECOVERY_INTERVAL_MS = 60_000;
let recoveryTimer: ReturnType<typeof setInterval> | null = null;
let recoveryRun: Promise<void> | null = null;

export const recoverExportJobs = (): Promise<void> => {
  if (recoveryRun) return recoveryRun;
  recoveryRun = (async () => {
    let jobs: ExportJob[];
    try {
      jobs = await exportRepo.findRecoverable(25);
    } catch (error) {
      if (isUndefinedTableError(error)) return;
      throw error;
    }
    for (const job of jobs) {
      try {
        await processExport(job);
      } catch (error) {
        log.error('Recoverable export job failed to execute', { jobId: job.id, error });
      }
    }
  })().finally(() => { recoveryRun = null; });
  return recoveryRun;
};

export const initExportRecoveryWorker = (): void => {
  if (recoveryTimer) return;
  void recoverExportJobs().catch((error: unknown) => {
    log.error('Initial export recovery scan failed', { error });
  });
  recoveryTimer = setInterval(() => {
    void recoverExportJobs().catch((error: unknown) => {
      log.error('Export recovery scan failed', { error });
    });
  }, EXPORT_RECOVERY_INTERVAL_MS);
  recoveryTimer.unref();
};

export const closeExportRecoveryWorker = async (): Promise<void> => {
  if (recoveryTimer) clearInterval(recoveryTimer);
  recoveryTimer = null;
  if (recoveryRun) await recoveryRun;
};


/** Only one canonical device reference is accepted; no ignored extra scopes. */
const normalizeScopedDeviceId = (raw: unknown): string => {
  if (typeof raw !== 'string' || !/^[A-Za-z0-9._:-]{1,96}$/.test(raw)) {
    throw createValidationError('A valid deviceId is required for a scoped Excel export');
  }
  return raw;
};

/**
 * Ordinary managers/operators may export only one currently granted device.
 * The worker and every SQL data page recheck current database authorization.
 */
export const createScopedDeviceExport = async (
  userId: number,
  input: { deviceId: unknown },
): Promise<ExportJobPublic> => {
  const deviceId = normalizeScopedDeviceId(input.deviceId);
  if (!await exportRepo.hasActiveDeviceGrantOwner(userId, deviceId)) {
    throw createForbiddenError('Device export access denied');
  }
  const job = await exportRepo.create(userId, { exportType: 'devices', filters: { deviceId } });
  void processExport(job).catch((error: unknown) => {
    log.error('Scoped export background processing failed', { jobId: job.id, error });
  });
  return { ...sanitizeExportJob(job), filePath: null };
};

const getAuthorizedScopedDeviceJob = async (id: number, userId: number): Promise<ExportJob> => {
  const job = await exportRepo.findById(id);
  if (!job || job.user_id !== userId || job.export_type !== 'devices' ||
      job.filters === null || Object.keys(job.filters).length !== 1) {
    throw createNotFoundError('Scoped export not found');
  }
  const deviceId = job.filters.deviceId;
  if (typeof deviceId !== 'string' ||
      !await exportRepo.hasActiveDeviceGrantOwner(userId, deviceId)) {
    throw createForbiddenError('Device export grant no longer valid');
  }
  return job;
};

export const getScopedDeviceExportStatus = async (
  id: number, userId: number,
): Promise<ExportJobPublic> => {
  const job = await getAuthorizedScopedDeviceJob(id, userId);
  return { ...sanitizeExportJob(job), filePath: null };
};

export const getScopedDeviceExportDownload = async (
  id: number, userId: number,
): Promise<{ path: string; exportType: string }> => {
  const job = await getAuthorizedScopedDeviceJob(id, userId);
  if (job.status !== 'completed' || !job.file_path) {
    throw createNotFoundError('Device export is not ready');
  }
  return { path: job.file_path, exportType: job.export_type };
};
