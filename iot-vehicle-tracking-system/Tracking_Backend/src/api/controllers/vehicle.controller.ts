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
import * as vehicleStatusService from '@/domain/vehicle/services/vehicle-status.service';

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
    throw createValidationError(
      'Invalid device assignment data',
      parsed.error.flatten().fieldErrors,
    );
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

export const setDeviceAssignment = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      throw createValidationError('Invalid vehicle ID');
    }

    const deviceId = (req.body?.deviceId as string | null | undefined) ?? null;
    if (!deviceId) {
      const vehicle = await vehicleAssignmentService.unassignDevice(id);
      sendOk(res, vehicle);
      return;
    }

    const vehicle = await vehicleAssignmentService.assignDevice(id, deviceId);
    sendOk(res, vehicle);
  },
);

export const importVehicles = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const rows = Array.isArray(req.body?.vehicles) ? req.body.vehicles : [];
  if (rows.length === 0) {
    throw createValidationError('vehicles array is required');
  }

  let imported = 0;
  const errors: Array<{ row: number; error: string }> = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index] as Record<string, unknown>;
    try {
      const vehicleId = String(row.vehicleId ?? '').trim();
      if (!vehicleId) {
        throw new Error('Missing vehicleId');
      }

      await vehicleCrudService.createVehicle({
        vehicleId,
        plateNumber: row.plateNumber ? String(row.plateNumber) : undefined,
        brand: row.brand ? String(row.brand) : undefined,
        model: row.model ? String(row.model) : undefined,
        year: row.year ? Number(row.year) : undefined,
        customerId: row.customerId ? Number(row.customerId) : undefined,
        deviceId: row.deviceId ? String(row.deviceId) : undefined,
        notes: row.notes ? String(row.notes) : undefined,
      });
      imported += 1;
    } catch (error) {
      errors.push({ row: index + 1, error: (error as Error).message });
    }
  }

  sendOk(res, {
    imported,
    failed: errors.length,
    errors,
  });
});

export const getVehicleStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid vehicle ID');
  }

  const status = await vehicleStatusService.getVehicleStatus(id);
  sendOk(res, status);
});
