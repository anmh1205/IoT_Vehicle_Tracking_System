import * as exportRepo from '@/domain/export/repositories/export.repository';
import { processExport } from '@/domain/export/services/export-processing.service';
import type {
  ExportJob,
  ExportJobPublic,
  CreateExportInput,
} from '@/domain/export/types/export.types';
import { createNotFoundError, createForbiddenError } from '@/shared/utils/errors.util';
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
  void processExport(job);

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
