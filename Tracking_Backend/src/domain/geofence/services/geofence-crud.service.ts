import { createNotFoundError } from '@/shared/utils/errors.util';
import * as geofenceRepo from '@/domain/geofence/repositories/geofence.repository';
import { logger } from '@/infrastructure/logger';
import type { Geofence, CreateGeofenceInput, UpdateGeofenceInput, GeofencePublic } from '@/domain/geofence/types/geofence.types';

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
  createdAt: g.created_at.toISOString(),
  updatedAt: g.updated_at.toISOString(),
});

export const getGeofenceById = async (id: number): Promise<GeofencePublic> => {
  const geofence = await geofenceRepo.findById(id);
  if (!geofence) {
    throw createNotFoundError(`Geofence with ID ${id} not found`);
  }
  return sanitizeGeofence(geofence);
};

export const createGeofence = async (input: CreateGeofenceInput, createdBy?: number): Promise<GeofencePublic> => {
  const geofence = await geofenceRepo.create(input, createdBy);
  logger.info(`Geofence "${input.name}" created successfully`);
  return sanitizeGeofence(geofence);
};

export const updateGeofence = async (id: number, input: UpdateGeofenceInput): Promise<GeofencePublic> => {
  const existing = await geofenceRepo.findById(id);
  if (!existing) {
    throw createNotFoundError(`Geofence with ID ${id} not found`);
  }

  const updated = await geofenceRepo.update(id, input);
  if (!updated) {
    throw createNotFoundError(`Geofence with ID ${id} not found`);
  }

  logger.info(`Geofence "${existing.name}" updated successfully`);
  return sanitizeGeofence(updated);
};

export const deleteGeofence = async (id: number): Promise<void> => {
  const existing = await geofenceRepo.findById(id);
  if (!existing) {
    throw createNotFoundError(`Geofence with ID ${id} not found`);
  }

  await geofenceRepo.remove(id);
  logger.info(`Geofence "${existing.name}" deleted successfully`);
};

export const assignVehicleToGeofence = async (geofenceId: number, vehicleId: string): Promise<{ success: true }> => {
  const geofence = await geofenceRepo.findById(geofenceId);
  if (!geofence) {
    throw createNotFoundError(`Geofence with ID ${geofenceId} not found`);
  }

  await geofenceRepo.assignVehicle(geofenceId, vehicleId);
  logger.info(`Vehicle "${vehicleId}" assigned to geofence "${geofence.name}"`);
  return { success: true };
};

export const unassignVehicleFromGeofence = async (geofenceId: number, vehicleId: string): Promise<{ success: true }> => {
  const geofence = await geofenceRepo.findById(geofenceId);
  if (!geofence) {
    throw createNotFoundError(`Geofence with ID ${geofenceId} not found`);
  }

  const removed = await geofenceRepo.unassignVehicle(geofenceId, vehicleId);
  if (!removed) {
    throw createNotFoundError(`Vehicle "${vehicleId}" is not assigned to this geofence`);
  }

  logger.info(`Vehicle "${vehicleId}" unassigned from geofence "${geofence.name}"`);
  return { success: true };
};
