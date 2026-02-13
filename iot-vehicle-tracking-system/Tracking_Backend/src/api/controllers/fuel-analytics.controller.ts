import type { Response } from 'express';
import type { AuthenticatedRequest } from '@/shared/types/common.types';
import { asyncHandler } from '@/shared/utils/async-handler.util';
import { sendOk } from '@/shared/utils/response.util';
import * as fuelAnalyticsService from '@/domain/fuel-analytics/services/fuel-analytics.service';

export const getSummary = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await fuelAnalyticsService.getFuelSummary({
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
  });

  sendOk(res, result);
});

export const getByVehicle = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await fuelAnalyticsService.getFuelByVehicle({
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
  });

  sendOk(res, result);
});

export const getTrends = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await fuelAnalyticsService.getFuelTrends({
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
    interval: req.query.interval as string | undefined,
  });

  sendOk(res, result);
});
