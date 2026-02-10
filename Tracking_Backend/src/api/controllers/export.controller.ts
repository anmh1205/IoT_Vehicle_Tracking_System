import type { Response } from 'express';
import type { AuthenticatedRequest } from '@/shared/types/common.types';
import { asyncHandler } from '@/shared/utils/async-handler.util';
import { sendOk, sendCreated } from '@/shared/utils/response.util';
import { createValidationError } from '@/shared/utils/errors.util';
import * as exportJobService from '@/domain/export/services/export-job.service';

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
