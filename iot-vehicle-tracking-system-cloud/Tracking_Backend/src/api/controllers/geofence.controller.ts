import type { Response } from 'express';
import type { AuthenticatedRequest } from '@/shared/types/common.types';
import { asyncHandler } from '@/shared/utils/async-handler.util';
import { sendOk, sendCreated } from '@/shared/utils/response.util';
import { createValidationError } from '@/shared/utils/errors.util';
import {
  createGeofenceSchema,
  updateGeofenceSchema,
  geofenceListQuerySchema,
  assignVehicleToGeofenceSchema,
  createVehiclePolicySchema,
  updateVehiclePolicySchema,
  vehiclePolicyListQuerySchema,
  policyViolationListQuerySchema,
  upsertVehicleAllowedZoneSchema,
} from '@/api/validators/geofence.validator';
import * as geofenceCrudService from '@/domain/geofence/services/geofence-crud.service';
import * as geofenceListService from '@/domain/geofence/services/geofence-list.service';
import * as vehiclePolicyCrudService from '@/domain/geofence/services/vehicle-policy-crud.service';
import * as vehicleAllowedZoneService from '@/domain/geofence/services/vehicle-allowed-zone.service';

export const listGeofences = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const parsed = geofenceListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw createValidationError('Invalid query parameters', parsed.error.flatten().fieldErrors);
  }

  const result = await geofenceListService.listGeofences(parsed.data);
  sendOk(res, result);
});

export const getGeofence = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid geofence ID');
  }

  const geofence = await geofenceCrudService.getGeofenceById(id);
  sendOk(res, geofence);
});

export const createGeofence = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const parsed = createGeofenceSchema.safeParse(req.body);
  if (!parsed.success) {
    throw createValidationError('Invalid geofence data', parsed.error.flatten().fieldErrors);
  }

  const createdBy = req.user?.id;
  const geofence = await geofenceCrudService.createGeofence(parsed.data, createdBy);
  sendCreated(res, geofence);
});

export const updateGeofence = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid geofence ID');
  }

  const parsed = updateGeofenceSchema.safeParse(req.body);
  if (!parsed.success) {
    throw createValidationError('Invalid geofence data', parsed.error.flatten().fieldErrors);
  }

  const geofence = await geofenceCrudService.updateGeofence(id, parsed.data);
  sendOk(res, geofence);
});

export const deleteGeofence = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid geofence ID');
  }

  await geofenceCrudService.deleteGeofence(id);
  sendOk(res, { success: true });
});

export const assignVehicle = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid geofence ID');
  }

  const parsed = assignVehicleToGeofenceSchema.safeParse(req.body);
  if (!parsed.success) {
    throw createValidationError(
      'Invalid vehicle assignment data',
      parsed.error.flatten().fieldErrors,
    );
  }

  const result = await geofenceCrudService.assignVehicleToGeofence(id, parsed.data.vehicleId);
  sendCreated(res, result);
});

export const unassignVehicle = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const geofenceId = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(geofenceId)) {
    throw createValidationError('Invalid geofence ID');
  }

  const { vehicleId } = req.params;
  if (!vehicleId) {
    throw createValidationError('Vehicle ID is required');
  }

  const result = await geofenceCrudService.unassignVehicleFromGeofence(geofenceId, vehicleId);
  sendOk(res, result);
});

export const listVehiclePolicies = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const parsed = vehiclePolicyListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw createValidationError('Invalid query parameters', parsed.error.flatten().fieldErrors);
  }

  const result = await vehiclePolicyCrudService.listVehiclePolicies(parsed.data);
  sendOk(res, result);
});

export const getVehiclePolicy = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.policyId, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid policy ID');
  }

  const policy = await vehiclePolicyCrudService.getVehiclePolicyById(id);
  sendOk(res, policy);
});

export const createVehiclePolicy = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const parsed = createVehiclePolicySchema.safeParse(req.body);
  if (!parsed.success) {
    throw createValidationError('Invalid policy data', parsed.error.flatten().fieldErrors);
  }

  const policy = await vehiclePolicyCrudService.createVehiclePolicy(parsed.data, req.user?.id);
  sendCreated(res, policy);
});

export const updateVehiclePolicy = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.policyId, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid policy ID');
  }

  const parsed = updateVehiclePolicySchema.safeParse(req.body);
  if (!parsed.success) {
    throw createValidationError('Invalid policy data', parsed.error.flatten().fieldErrors);
  }

  const policy = await vehiclePolicyCrudService.updateVehiclePolicy(id, parsed.data, req.user?.id);
  sendOk(res, policy);
});

export const getVehicleAllowedZone = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { vehicleId } = req.params;
  if (!vehicleId) {
    throw createValidationError('Vehicle ID is required');
  }

  const zone = await vehicleAllowedZoneService.getVehicleAllowedZone(vehicleId);
  sendOk(res, zone);
});

export const previewVehicleAllowedZoneCenter = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { vehicleId } = req.params;
    if (!vehicleId) {
      throw createValidationError('Vehicle ID is required');
    }

    const preview = await vehicleAllowedZoneService.previewVehicleAllowedZoneCenter(vehicleId);
    sendOk(res, preview);
  },
);

export const upsertVehicleAllowedZone = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { vehicleId } = req.params;
  if (!vehicleId) {
    throw createValidationError('Vehicle ID is required');
  }

  const parsed = upsertVehicleAllowedZoneSchema.safeParse(req.body);
  if (!parsed.success) {
    throw createValidationError('Invalid allowed zone data', parsed.error.flatten().fieldErrors);
  }

  const zone = await vehicleAllowedZoneService.upsertVehicleAllowedZone(
    vehicleId,
    parsed.data,
    req.user?.id,
  );
  sendOk(res, zone);
});

export const deleteVehicleAllowedZone = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { vehicleId } = req.params;
  if (!vehicleId) {
    throw createValidationError('Vehicle ID is required');
  }

  const result = await vehicleAllowedZoneService.disableVehicleAllowedZone(vehicleId, req.user?.id);
  sendOk(res, result);
});

export const listVehiclePolicyStates = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { vehicleId } = req.params;
  if (!vehicleId) {
    throw createValidationError('Vehicle ID is required');
  }

  const states = await vehiclePolicyCrudService.listVehiclePolicyStates(vehicleId);
  sendOk(res, { items: states });
});

export const listVehiclePolicyViolations = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = policyViolationListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw createValidationError('Invalid query parameters', parsed.error.flatten().fieldErrors);
    }

    const result = await vehiclePolicyCrudService.listVehiclePolicyViolations(parsed.data);
    sendOk(res, result);
  },
);
