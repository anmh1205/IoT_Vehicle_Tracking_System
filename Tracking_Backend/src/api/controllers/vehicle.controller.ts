import type { Response } from 'express';
import type { AuthenticatedRequest } from '@/shared/types/common.types';
import { asyncHandler } from '@/shared/utils/async-handler.util';
import { sendOk, sendCreated } from '@/shared/utils/response.util';
import { createValidationError } from '@/shared/utils/errors.util';
import {
  createVehicleSchema,
  updateVehicleSchema,
  vehicleListQuerySchema,
  assignDeviceSchema,
} from '@/api/validators/vehicle.validator';
import * as vehicleCrudService from '@/domain/vehicle/services/vehicle-crud.service';
import * as vehicleListService from '@/domain/vehicle/services/vehicle-list.service';
import * as vehicleAssignmentService from '@/domain/vehicle/services/vehicle-assignment.service';

export const listVehicles = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const parsed = vehicleListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw createValidationError('Invalid query parameters', parsed.error.flatten().fieldErrors);
  }

  const result = await vehicleListService.listVehicles(parsed.data);
  sendOk(res, result);
});

export const getVehicle = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid vehicle ID');
  }

  const vehicle = await vehicleCrudService.getVehicleById(id);
  sendOk(res, vehicle);
});

export const createVehicle = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const parsed = createVehicleSchema.safeParse(req.body);
  if (!parsed.success) {
    throw createValidationError('Invalid vehicle data', parsed.error.flatten().fieldErrors);
  }

  const vehicle = await vehicleCrudService.createVehicle(parsed.data);
  sendCreated(res, vehicle);
});

export const updateVehicle = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid vehicle ID');
  }

  const parsed = updateVehicleSchema.safeParse(req.body);
  if (!parsed.success) {
    throw createValidationError('Invalid vehicle data', parsed.error.flatten().fieldErrors);
  }

  const vehicle = await vehicleCrudService.updateVehicle(id, parsed.data);
  sendOk(res, vehicle);
});

export const deleteVehicle = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid vehicle ID');
  }

  await vehicleCrudService.deleteVehicle(id);
  sendOk(res, { success: true });
});

export const assignDevice = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid vehicle ID');
  }

  const parsed = assignDeviceSchema.safeParse(req.body);
  if (!parsed.success) {
    throw createValidationError('Invalid device assignment data', parsed.error.flatten().fieldErrors);
  }

  const vehicle = await vehicleAssignmentService.assignDevice(id, parsed.data.deviceId);
  sendOk(res, vehicle);
});

export const unassignDevice = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid vehicle ID');
  }

  const vehicle = await vehicleAssignmentService.unassignDevice(id);
  sendOk(res, vehicle);
});
