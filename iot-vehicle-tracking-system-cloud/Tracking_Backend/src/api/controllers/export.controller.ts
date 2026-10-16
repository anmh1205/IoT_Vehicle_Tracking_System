import type { Response } from 'express';
import type { AuthenticatedRequest } from '@/shared/types/common.types';
import { asyncHandler } from '@/shared/utils/async-handler.util';
import { sendOk, sendCreated } from '@/shared/utils/response.util';
import { createValidationError, createNotFoundError } from '@/shared/utils/errors.util';
import * as exportJobService from '@/domain/export/services/export-job.service';
import { existsSync } from 'node:fs';

export const listExports = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const jobs = await exportJobService.listExports(userId);
  sendOk(res, jobs);
});

export const createExport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { exportType, filters } = req.body;

  if (!exportType) {
    throw createValidationError('Missing required field: exportType');
  }

  const job = await exportJobService.createExport(userId, { exportType, filters });
  sendCreated(res, job);
});

export const getExportStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid export job ID');
  }

  const job = await exportJobService.getExportStatus(id, userId);
  sendOk(res, job);
});

export const downloadExport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid export job ID');
  }

  const job = await exportJobService.getExportStatus(id, userId);
  if (job.status !== 'completed' || !job.filePath) {
    throw createNotFoundError('Export file is not ready');
  }

  if (!existsSync(job.filePath)) {
    throw createNotFoundError('Export file not found on disk');
  }

  const fileName = `${job.exportType}_export_${job.id}.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.download(job.filePath, fileName);
});


const scopedJobId = (raw: unknown): number => {
  if (typeof raw !== 'string' || !/^[1-9][0-9]*$/.test(raw)) {
    throw createValidationError('Invalid scoped export job ID');
  }
  const id = Number(raw);
  if (!Number.isSafeInteger(id)) throw createValidationError('Invalid scoped export job ID');
  return id;
};

/** Explicitly scoped route, independent from administrator-only full-fleet API. */
export const createScopedDeviceExport = asyncHandler(async (
  req: AuthenticatedRequest, res: Response,
) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body) ||
      Object.keys(req.body).length !== 1) {
    throw createValidationError('Only deviceId is supported for scoped exports');
  }
  const job = await exportJobService.createScopedDeviceExport(req.user!.id, {
    deviceId: req.body.deviceId,
  });
  sendCreated(res, job);
});

export const getScopedDeviceExportStatus = asyncHandler(async (
  req: AuthenticatedRequest, res: Response,
) => {
  const job = await exportJobService.getScopedDeviceExportStatus(
    scopedJobId(req.params.id), req.user!.id,
  );
  sendOk(res, job);
});

export const downloadScopedDeviceExport = asyncHandler(async (
  req: AuthenticatedRequest, res: Response,
) => {
  const id = scopedJobId(req.params.id);
  const file = await exportJobService.getScopedDeviceExportDownload(id, req.user!.id);
  if (!existsSync(file.path)) {
    throw createNotFoundError('Device export file not found on disk');
  }
  const name = `device_export_${id}.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.download(file.path, name);
});
