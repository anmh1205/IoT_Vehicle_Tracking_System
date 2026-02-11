import * as exportRepo from '@/domain/export/repositories/export.repository';
import type {
  ExportJob,
  ExportJobPublic,
  CreateExportInput,
} from '@/domain/export/types/export.types';
import { createNotFoundError, createForbiddenError } from '@/shared/utils/errors.util';

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
  const jobs = await exportRepo.findAll(userId);
  return jobs.map(sanitizeExportJob);
};

export const createExport = async (
  userId: number,
  input: CreateExportInput,
): Promise<ExportJobPublic> => {
  const job = await exportRepo.create(userId, input);
  return sanitizeExportJob(job);
};

export const getExportStatus = async (id: number, userId: number): Promise<ExportJobPublic> => {
  const job = await exportRepo.findById(id);
  if (!job) throw createNotFoundError('Export job not found');
  if (job.user_id !== userId) throw createForbiddenError('Access denied to this export job');
  return sanitizeExportJob(job);
};
