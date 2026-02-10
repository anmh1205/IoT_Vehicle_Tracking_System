import type { Response } from 'express';
import type { AuthenticatedRequest } from '@/shared/types/common.types';
import { asyncHandler } from '@/shared/utils/async-handler.util';
import { sendOk, sendCreated } from '@/shared/utils/response.util';
import { createValidationError } from '@/shared/utils/errors.util';
import {
  createDeviceSchema,
  updateDeviceSchema,
  deviceListQuerySchema,
} from '@/api/validators/device.validator';
import * as deviceCrudService from '@/domain/device/services/device-crud.service';
import * as deviceListService from '@/domain/device/services/device-list.service';
import * as deviceDetailsService from '@/domain/device/services/device-details.service';
import * as deviceSessionsService from '@/domain/device/services/device-sessions.service';
import * as deviceRuntimeService from '@/domain/device/services/device-runtime.service';

export const listDevices = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const parsed = deviceListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw createValidationError('Invalid query parameters', parsed.error.flatten().fieldErrors);
  }

  const result = await deviceListService.listDevices(parsed.data);
  sendOk(res, result);
});

export const getDevice = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid device ID');
  }

  const device = await deviceDetailsService.getDeviceDetail(id);
  sendOk(res, device);
});

export const createDevice = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const parsed = createDeviceSchema.safeParse(req.body);
  if (!parsed.success) {
    throw createValidationError('Invalid device data', parsed.error.flatten().fieldErrors);
  }

  const device = await deviceCrudService.createDevice(parsed.data);
  sendCreated(res, device);
});

export const updateDevice = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid device ID');
  }

  const parsed = updateDeviceSchema.safeParse(req.body);
  if (!parsed.success) {
    throw createValidationError('Invalid device data', parsed.error.flatten().fieldErrors);
  }

  const device = await deviceCrudService.updateDevice(id, parsed.data);
  sendOk(res, device);
});

export const deleteDevice = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid device ID');
  }

  await deviceCrudService.deleteDevice(id);
  sendOk(res, { success: true });
});

export const getDeviceSessions = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid device ID');
  }

  // Look up the device to get device_id string from numeric id
  const device = await deviceDetailsService.getDeviceDetail(id);
  const page = req.query.page ? Number.parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 20;

  const result = await deviceSessionsService.getDeviceSessions(device.deviceId, page, limit);
  sendOk(res, result);
});

export const getRuntimeStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid device ID');
  }

  const device = await deviceDetailsService.getDeviceDetail(id);
  const stats = await deviceRuntimeService.getRuntimeStats(device.deviceId);
  sendOk(res, stats);
});

export const getDevicePositions = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const positions = await deviceListService.getDevicePositions();
  sendOk(res, positions);
});

export const regenerateToken = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid device ID');
  }

  const result = await deviceCrudService.regenerateToken(id);
  sendOk(res, result);
});
