import type { Response } from 'express';
import type { AuthenticatedRequest } from '@/shared/types/common.types';
import { asyncHandler } from '@/shared/utils/async-handler.util';
import { sendOk } from '@/shared/utils/response.util';
import { createValidationError } from '@/shared/utils/errors.util';
import {
  listZoneBoundariesQuerySchema,
  resolveZoneBoundariesSchema,
  upsertVehicleZoneSchema,
} from '@/api/validators/zone.validator';
import * as vehicleZoneService from '@/domain/zone/services/vehicle-zone.service';

export const listVehicleZones = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  sendOk(res, await vehicleZoneService.listVehicleZones());
});

export const getVehicleZone = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { vehicleId } = req.params;
  if (!vehicleId) {
    throw createValidationError('Vehicle ID is required');
  }

  sendOk(res, await vehicleZoneService.getVehicleZone(vehicleId));
});

export const upsertVehicleZone = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { vehicleId } = req.params;
  if (!vehicleId) {
    throw createValidationError('Vehicle ID is required');
  }

  const parsed = upsertVehicleZoneSchema.safeParse(req.body);
  if (!parsed.success) {
    throw createValidationError('Invalid zone data', parsed.error.flatten().fieldErrors);
  }

  sendOk(res, await vehicleZoneService.upsertVehicleZone(vehicleId, parsed.data, req.user?.id));
});

export const deleteVehicleZone = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { vehicleId } = req.params;
  if (!vehicleId) {
    throw createValidationError('Vehicle ID is required');
  }

  sendOk(res, await vehicleZoneService.disableVehicleZone(vehicleId, req.user?.id));
});

export const previewVehicleZoneCircleCenter = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { vehicleId } = req.params;
    if (!vehicleId) {
      throw createValidationError('Vehicle ID is required');
    }

    sendOk(res, await vehicleZoneService.previewVehicleZoneCircleCenter(vehicleId));
  },
);

export const listZoneBoundaries = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const parsed = listZoneBoundariesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw createValidationError('Invalid query parameters', parsed.error.flatten().fieldErrors);
  }

  sendOk(res, {
    items: await vehicleZoneService.searchZoneBoundaries(parsed.data),
  });
});

export const resolveZoneBoundaries = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const parsed = resolveZoneBoundariesSchema.safeParse(req.body);
  if (!parsed.success) {
    throw createValidationError('Invalid boundary selections', parsed.error.flatten().fieldErrors);
  }

  sendOk(res, await vehicleZoneService.resolveZoneBoundaries(parsed.data));
});
