import { createNotFoundError } from '@/shared/utils/errors.util';
import * as geofenceRepo from '@/domain/geofence/repositories/geofence.repository';
import type { GeofenceAccessScope } from '@/domain/geofence/repositories/vehicle-policy.repository';
import { logger } from '@/infrastructure/logger';
import type { Geofence, CreateGeofenceInput, UpdateGeofenceInput, GeofencePublic }
  from '@/domain/geofence/types/geofence.types';

const sanitizeGeofence = (g: Geofence): GeofencePublic => ({
  id: g.id,
  name: g.name,
  description: g.description,
  geofenceType: g.geofence_type,
  centerLatitude: g.center_latitude,
  centerLongitude: g.center_longitude,
  radiusMeters: g.radius_meters,
  coordinates: g.coordinates,
  triggerOn: g.trigger_on,
  isActive: g.is_active,
  notifyEmail: g.notify_email,
  notifyPush: g.notify_push,
  color: g.color,
  displayHidden: g.display_hidden,
  createdBy: g.created_by,
  vehicleIds: [],
  createdAt: g.created_at.toISOString(),
  updatedAt: g.updated_at.toISOString(),
});

const hydrateVehicleIds = async (geofence: Geofence, scope?: GeofenceAccessScope): Promise<GeofencePublic> => {
  const vehicleIds = scope
    ? await geofenceRepo.findVehiclesByGeofenceIdForScope(geofence.id, scope)
    : await geofenceRepo.findVehiclesByGeofenceId(geofence.id);
  return {
    ...sanitizeGeofence(geofence),
    vehicleIds: vehicleIds.map((row) => row.vehicle_id),
  };
};

export const getGeofenceById = async (id: number, scope: GeofenceAccessScope): Promise<GeofencePublic> => {
  const geofence = await geofenceRepo.findByIdForScope(id, scope);
  if (!geofence) {
    throw createNotFoundError(`Vùng với ID ${id} không tồn tại`);
  }
  return hydrateVehicleIds(geofence, scope);
};

export const createGeofence = async (
  input: CreateGeofenceInput,
  createdBy?: number,
): Promise<GeofencePublic> => {
  const geofence = await geofenceRepo.create(input, createdBy);
  logger.info(`Zone "${input.name}" created successfully`);
  return hydrateVehicleIds(geofence);
};

export const updateGeofence = async (
  id: number,
  input: UpdateGeofenceInput,
  scope: GeofenceAccessScope,
): Promise<GeofencePublic> => {
  const existing = await geofenceRepo.findByIdForWriteScope(id, scope);
  if (!existing) {
    throw createNotFoundError(`Vùng với ID ${id} không tồn tại`);
  }

  const updated = await geofenceRepo.update(id, input, scope);
  if (!updated) {
    throw createNotFoundError(`Vùng với ID ${id} không tồn tại`);
  }

  logger.info(`Zone "${existing.name}" updated successfully`);
  return hydrateVehicleIds(updated, scope);
};

export const deleteGeofence = async (id: number): Promise<void> => {
  const existing = await geofenceRepo.findById(id);
  if (!existing) {
    throw createNotFoundError(`Vùng với ID ${id} không tồn tại`);
  }

  await geofenceRepo.remove(id);
  logger.info(`Zone "${existing.name}" deleted successfully`);
};

export const assignVehicleToGeofence = async (
  geofenceId: number,
  vehicleId: string,
  scope: GeofenceAccessScope,
): Promise<{ success: true }> => {
  const geofence = await geofenceRepo.findById(geofenceId);
  if (!geofence) {
    throw createNotFoundError(`Vùng với ID ${geofenceId} không tồn tại`);
  }

  const assigned = await geofenceRepo.assignVehicle(geofenceId, vehicleId, scope);
  if (assigned === 0) {
    throw createNotFoundError('Vehicle not found or geofence assignment denied');
  }
  logger.info(`Vehicle "${vehicleId}" assigned to zone "${geofence.name}"`);
  return { success: true };
};

export const unassignVehicleFromGeofence = async (
  geofenceId: number,
  vehicleId: string,
  scope: GeofenceAccessScope,
): Promise<{ success: true }> => {
  const geofence = await geofenceRepo.findById(geofenceId);
  if (!geofence) {
    throw createNotFoundError(`Vùng với ID ${geofenceId} không tồn tại`);
  }

  const removed = await geofenceRepo.unassignVehicle(geofenceId, vehicleId, scope);
  if (!removed) {
    throw createNotFoundError(`Phương tiện "${vehicleId}" chưa được gán vào vùng này`);
  }

  logger.info(`Vehicle "${vehicleId}" unassigned from zone "${geofence.name}"`);
  return { success: true };
};
