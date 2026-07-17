import type { Response } from 'express';
import type { AuthenticatedRequest } from '@/shared/types/common.types';
import { asyncHandler } from '@/shared/utils/async-handler.util';
import { sendOk } from '@/shared/utils/response.util';
import { createForbiddenError } from '@/shared/utils/errors.util';
import * as systemStatusService from '@/domain/system/services/system-status.service';

const ADMIN_ROLES = new Set(['admin', 'root']);

const assertCanAccessSystemStatus = (req: AuthenticatedRequest): void => {
  if (!req.user || !ADMIN_ROLES.has(req.user.role)) {
    throw createForbiddenError('Admin access required');
  }
};

export const getHealth = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  assertCanAccessSystemStatus(req);
  const health = await systemStatusService.getSystemHealth();
  sendOk(res, health);
});

export const getMetrics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  assertCanAccessSystemStatus(req);
  const metrics = await systemStatusService.getSystemMetrics();
  sendOk(res, metrics);
});
