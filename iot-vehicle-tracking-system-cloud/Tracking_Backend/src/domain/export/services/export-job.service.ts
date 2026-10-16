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
