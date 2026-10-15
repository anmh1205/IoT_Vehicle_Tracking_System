import type { Response } from 'express';
import type { AuthenticatedRequest } from '@/shared/types/common.types';
import { asyncHandler } from '@/shared/utils/async-handler.util';
import { sendOk } from '@/shared/utils/response.util';
import * as statisticsService from '@/domain/statistics/services/statistics.service';

export const getFleetUsage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await statisticsService.getFleetUsageStats({
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
    interval: req.query.interval as string | undefined,
  }, req.user!);
  sendOk(res, result);
});

export const getDeviceUptime = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await statisticsService.getDeviceUptimeStats({
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
  }, req.user!);
  sendOk(res, result);
});

export const getAlertFrequency = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await statisticsService.getAlertFrequencyStats({
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
    interval: req.query.interval as string | undefined,
  }, req.user!);
  sendOk(res, result);
});

export const getTripSummary = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await statisticsService.getTripSummaryStats({
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
    interval: req.query.interval as string | undefined,
  }, req.user!);
  sendOk(res, result);
});

export const getSummary = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await statisticsService.getSummaryStats({
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
  }, req.user!);
  sendOk(res, result);
});

export const getPolicyLimits = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  sendOk(res, await statisticsService.getPolicyLimitsStats(req.user!));
});

export const getFleetStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  sendOk(res, await statisticsService.getFleetStats(req.user!));
});

export const getMaintenanceStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  sendOk(res, await statisticsService.getMaintenanceStats(req.user!));
});
