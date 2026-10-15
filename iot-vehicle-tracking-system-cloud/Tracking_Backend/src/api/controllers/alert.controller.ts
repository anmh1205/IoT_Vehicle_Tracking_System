import type { Response } from 'express';
import type { AuthenticatedRequest } from '@/shared/types/common.types';
import { asyncHandler } from '@/shared/utils/async-handler.util';
import { sendOk, sendCreated } from '@/shared/utils/response.util';
import { createValidationError } from '@/shared/utils/errors.util';
import {
  createAlertSchema,
  resolveAlertSchema,
  alertListQuerySchema,
} from '@/api/validators/alert.validator';
import * as alertCrudService from '@/domain/alert/services/alert-crud.service';
import * as alertListService from '@/domain/alert/services/alert-list.service';
import type { AlertAccessScope } from '@/domain/alert/repositories/alert.repository';

const accessScope = (req: AuthenticatedRequest): AlertAccessScope => ({
  userId: req.user!.id,
  role: req.user!.role,
  deviceAccessMode: req.user!.deviceAccessMode,
});

export const listAlerts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const parsed = alertListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw createValidationError('Invalid query parameters', parsed.error.flatten().fieldErrors);
  }

  const result = await alertListService.listAlerts(parsed.data, accessScope(req));
  sendOk(res, result);
});

export const getAlert = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid alert ID');
  }

  const alert = await alertCrudService.getAlertById(id, accessScope(req));
  sendOk(res, alert);
});

export const createAlert = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const parsed = createAlertSchema.safeParse(req.body);
  if (!parsed.success) {
    throw createValidationError('Invalid alert data', parsed.error.flatten().fieldErrors);
  }

  const alert = await alertCrudService.createAlert(parsed.data);
  sendCreated(res, alert);
});

export const acknowledgeAlert = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid alert ID');
  }

  const alert = await alertCrudService.acknowledgeAlert(id, accessScope(req));
  sendOk(res, alert);
});

export const resolveAlert = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid alert ID');
  }

  const parsed = resolveAlertSchema.safeParse(req.body);
  if (!parsed.success) {
    throw createValidationError('Invalid resolve data', parsed.error.flatten().fieldErrors);
  }

  const alert = await alertCrudService.resolveAlert(
    id,
    accessScope(req),
    parsed.data.resolutionNotes ?? null,
  );
  sendOk(res, alert);
});

export const dismissAlert = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid alert ID');
  }

  const alert = await alertCrudService.dismissAlert(id, accessScope(req));
  sendOk(res, alert);
});

export const deleteAlert = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid alert ID');
  }

  await alertCrudService.deleteAlert(id);
  sendOk(res, { success: true });
});
