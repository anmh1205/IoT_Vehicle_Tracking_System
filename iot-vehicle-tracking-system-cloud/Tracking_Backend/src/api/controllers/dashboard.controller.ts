import type { Response } from 'express';
import type { AuthenticatedRequest } from '@/shared/types/common.types';
import { asyncHandler } from '@/shared/utils/async-handler.util';
import { sendOk } from '@/shared/utils/response.util';
import * as dashboardStatsService from '@/domain/dashboard/services/dashboard-stats.service';
import type { DashboardDeviceScope } from '@/domain/dashboard/repositories/dashboard.repository';

const scopeOf = (req: AuthenticatedRequest): DashboardDeviceScope => ({
  userId: req.user!.id,
  role: req.user!.role,
  deviceAccessMode: req.user!.deviceAccessMode,
});

export const getStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const stats = await dashboardStatsService.getStats(scopeOf(req));
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

  const result = await dashboardStatsService.getActivity(query, scopeOf(req));
  sendOk(res, result);
});

export const getDeviceActivity = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const days = req.query.days ? Number.parseInt(req.query.days as string, 10) : 7;
  const items = await dashboardStatsService.getDeviceActivity(days, scopeOf(req));
  sendOk(res, { items });
});

export const getDeviceStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const items = await dashboardStatsService.getDeviceStatus(scopeOf(req));
  sendOk(res, { items });
});

export const getFleetRuntime = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const days = req.query.days ? Number.parseInt(req.query.days as string, 10) : 30;
  const items = await dashboardStatsService.getFleetRuntime(days, scopeOf(req));
  sendOk(res, { items });
});
