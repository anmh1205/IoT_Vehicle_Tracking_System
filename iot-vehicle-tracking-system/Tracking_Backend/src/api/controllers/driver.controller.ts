import type { Response } from 'express';
import type { AuthenticatedRequest } from '@/shared/types/common.types';
import { asyncHandler } from '@/shared/utils/async-handler.util';
import { sendOk, sendCreated } from '@/shared/utils/response.util';
import { createValidationError } from '@/shared/utils/errors.util';
import {
  createDriverSchema,
  updateDriverSchema,
  driverListQuerySchema,
} from '@/api/validators/driver.validator';
import * as driverCrudService from '@/domain/driver/services/driver-crud.service';
import * as driverListService from '@/domain/driver/services/driver-list.service';

export const listDrivers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const parsed = driverListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw createValidationError('Invalid query parameters', parsed.error.flatten().fieldErrors);
  }

  const result = await driverListService.listDrivers(parsed.data);
  sendOk(res, result);
});

export const getDriver = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid driver ID');
  }

  const driver = await driverCrudService.getDriverById(id);
  sendOk(res, driver);
});

export const createDriver = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const parsed = createDriverSchema.safeParse(req.body);
  if (!parsed.success) {
    throw createValidationError('Invalid driver data', parsed.error.flatten().fieldErrors);
  }

  const driver = await driverCrudService.createDriver(parsed.data);
  sendCreated(res, driver);
});

export const updateDriver = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid driver ID');
  }

  const parsed = updateDriverSchema.safeParse(req.body);
  if (!parsed.success) {
    throw createValidationError('Invalid driver data', parsed.error.flatten().fieldErrors);
  }

  const driver = await driverCrudService.updateDriver(id, parsed.data);
  sendOk(res, driver);
});

export const deleteDriver = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid driver ID');
  }

  await driverCrudService.deleteDriver(id);
  sendOk(res, { success: true });
});
