import type { Response } from 'express';
import type { AuthenticatedRequest } from '@/shared/types/common.types';
import { asyncHandler } from '@/shared/utils/async-handler.util';
import { createValidationError } from '@/shared/utils/errors.util';
import { sendOk } from '@/shared/utils/response.util';
import * as telemetryHistoryService from '@/domain/telemetry/services/telemetry-history.service';

export const getHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const deviceId = req.query.deviceId as string | undefined;
  if (!deviceId) {
    throw createValidationError('deviceId is required');
  }

  const data = await telemetryHistoryService.getTelemetryHistory({
    actor: req.user!,
    deviceId,
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
    fields: req.query.fields as string | undefined,
  });
  sendOk(res, data);
});

// The async export processor has no telemetry handler. Fail synchronously instead of
// persisting a job that is guaranteed to fail after a misleading HTTP 202 response.
export const createExport = asyncHandler(async (_req: AuthenticatedRequest, _res: Response) => {
  throw createValidationError('Telemetry export is not supported; use the authorized history endpoint');
});
