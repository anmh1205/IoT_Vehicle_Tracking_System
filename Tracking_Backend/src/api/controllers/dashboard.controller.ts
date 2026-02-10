import type { Response } from 'express';
import type { AuthenticatedRequest } from '@/shared/types/common.types';
import { asyncHandler } from '@/shared/utils/async-handler.util';
import { sendOk } from '@/shared/utils/response.util';
import * as dashboardStatsService from '@/domain/dashboard/services/dashboard-stats.service';

export const getStats = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const stats = await dashboardStatsService.getStats();
  sendOk(res, stats);
});

export const getActivity = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const query = {
    page: req.query.page ? Number.parseInt(req.query.page as string, 10) : undefined,
    limit: req.query.limit ? Number.parseInt(req.query.limit as string, 10) : undefined,
    deviceId: req.query.deviceId as string | undefined,
    eventType: req.query.eventType as string | undefined,
    severity: req.query.severity as string | undefined,
  };

  const result = await dashboardStatsService.getActivity(query);
  sendOk(res, result);
});
