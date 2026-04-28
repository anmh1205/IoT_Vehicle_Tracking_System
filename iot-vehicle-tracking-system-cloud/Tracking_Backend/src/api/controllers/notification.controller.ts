import type { Response } from 'express';
import type { AuthenticatedRequest } from '@/shared/types/common.types';
import { asyncHandler } from '@/shared/utils/async-handler.util';
import { sendOk } from '@/shared/utils/response.util';
import { createValidationError } from '@/shared/utils/errors.util';
import * as notificationService from '@/domain/notification/services/notification.service';

export const listNotifications = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const page = req.query.page ? Number.parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 20;
  const type = req.query.type as
    | 'alert'
    | 'system'
    | 'export'
    | 'firmware'
    | 'zone'
    | undefined;
  const isRead =
    req.query.isRead === undefined ? undefined : String(req.query.isRead).toLowerCase() === 'true';
  const search = req.query.search as string | undefined;
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;

  const result = await notificationService.listNotifications(userId, {
    page,
    limit,
    isRead,
    type,
    search,
    from,
    to,
  });
  sendOk(res, result);
});

export const markRead = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid notification ID');
  }

  await notificationService.markRead(userId, id);
  sendOk(res, { success: true });
});

export const markAllRead = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  await notificationService.markAllRead(userId);
  sendOk(res, { success: true });
});

export const deleteNotification = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid notification ID');
  }

  await notificationService.deleteNotification(userId, id);
  sendOk(res, { success: true });
});

export const getStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const stats = await notificationService.getNotificationStats(userId);
  sendOk(res, stats);
});
