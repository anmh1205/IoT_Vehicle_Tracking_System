import type { Response } from 'express';
import type { AuthenticatedRequest } from '@/shared/types/common.types';
import { asyncHandler } from '@/shared/utils/async-handler.util';
import { sendOk, sendCreated } from '@/shared/utils/response.util';
import { createValidationError } from '@/shared/utils/errors.util';
import {
  createMaintenanceSchema,
  updateMaintenanceSchema,
  maintenanceListQuerySchema,
} from '@/api/validators/maintenance.validator';
import * as maintenanceCrudService from '@/domain/maintenance/services/maintenance-crud.service';
import * as maintenanceListService from '@/domain/maintenance/services/maintenance-list.service';

export const listMaintenance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const parsed = maintenanceListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw createValidationError('Invalid query parameters', parsed.error.flatten().fieldErrors);
  }

  const result = await maintenanceListService.listMaintenance(parsed.data);
  sendOk(res, result);
});

export const getMaintenance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid maintenance ID');
  }

  const record = await maintenanceCrudService.getMaintenanceById(id);
  sendOk(res, record);
});

export const createMaintenance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const parsed = createMaintenanceSchema.safeParse(req.body);
  if (!parsed.success) {
    throw createValidationError('Invalid maintenance data', parsed.error.flatten().fieldErrors);
  }

  const createdBy = req.user?.id;
  const record = await maintenanceCrudService.createMaintenance(parsed.data, createdBy);
  sendCreated(res, record);
});

export const updateMaintenance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid maintenance ID');
  }

  const parsed = updateMaintenanceSchema.safeParse(req.body);
  if (!parsed.success) {
    throw createValidationError('Invalid maintenance data', parsed.error.flatten().fieldErrors);
  }

  const record = await maintenanceCrudService.updateMaintenance(id, parsed.data);
  sendOk(res, record);
});

export const deleteMaintenance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid maintenance ID');
  }

  await maintenanceCrudService.deleteMaintenance(id);
  sendOk(res, { success: true });
});
