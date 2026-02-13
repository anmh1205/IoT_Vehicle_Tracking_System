import type { Response } from 'express';
import type { AuthenticatedRequest } from '@/shared/types/common.types';
import { asyncHandler } from '@/shared/utils/async-handler.util';
import { createValidationError } from '@/shared/utils/errors.util';
import { sendOk } from '@/shared/utils/response.util';
import * as telemetryHistoryService from '@/domain/telemetry/services/telemetry-history.service';
import * as exportJobService from '@/domain/export/services/export-job.service';

export const getHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const deviceId = req.query.deviceId as string | undefined;
  if (!deviceId) {
    throw createValidationError('deviceId is required');
  }

  const data = await telemetryHistoryService.getTelemetryHistory({
    deviceId,
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
    fields: req.query.fields as string | undefined,
  });
  sendOk(res, data);
});

export const createExport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { deviceIds, from, to, format } = req.body as {
    deviceIds?: string[];
    from?: string;
    to?: string;
    format?: string;
  };

  if (!deviceIds || deviceIds.length === 0) {
    throw createValidationError('deviceIds is required');
  }

  const job = await exportJobService.createExport(userId, {
    exportType: 'telemetry',
    filters: {
      deviceIds,
      from: from ?? null,
      to: to ?? null,
      format: format ?? 'csv',
    },
  });

  res.status(202).json({
    success: true,
    data: { jobId: job.id, status: job.status },
    timestamp: new Date().toISOString(),
  });
});
