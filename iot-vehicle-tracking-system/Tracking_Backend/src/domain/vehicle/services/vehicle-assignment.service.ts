import { createNotFoundError, createValidationError } from '@/shared/utils/errors.util';
import * as vehicleRepo from '@/domain/vehicle/repositories/vehicle.repository';
import { logger } from '@/infrastructure/logger';
import type { Vehicle, VehiclePublic } from '@/domain/vehicle/types/vehicle.types';

const sanitizeVehicle = (v: Vehicle): VehiclePublic => ({
  id: v.id,
  vehicleId: v.vehicle_id,
  plateNumber: v.plate_number,
  deviceId: v.device_id,
  customerId: v.customer_id,
  vehicleType: v.vehicle_type,
  brand: v.brand,
  model: v.model,
  year: v.year,
  color: v.color,
  vin: v.vin,
  seats: v.seats,
  transmission: v.transmission,
  fuelType: v.fuel_type,
  mileageKm: v.mileage_km,
  registrationNumber: v.registration_number,
  insuranceExpiry: v.insurance_expiry?.toISOString() ?? null,
  status: v.status,
  iconType: v.icon_type,
  colorHex: v.color_hex,
  notes: v.notes,
  createdAt: v.created_at.toISOString(),
  updatedAt: v.updated_at.toISOString(),
});

export const assignDevice = async (vehicleId: number, deviceId: string): Promise<VehiclePublic> => {
  const vehicle = await vehicleRepo.findById(vehicleId);
  if (!vehicle) {
    throw createNotFoundError(`Vehicle with ID ${vehicleId} not found`);
  }

  if (vehicle.device_id === deviceId) {
    throw createValidationError(`Device "${deviceId}" is already assigned to this vehicle`);
  }

  const updated = await vehicleRepo.updateDeviceAssignment(vehicleId, deviceId);
  if (!updated) {
    throw createNotFoundError(`Vehicle with ID ${vehicleId} not found`);
  }

  logger.info(`Device "${deviceId}" assigned to vehicle "${vehicle.vehicle_id}"`);
  return sanitizeVehicle(updated);
};

export const unassignDevice = async (vehicleId: number): Promise<VehiclePublic> => {
  const vehicle = await vehicleRepo.findById(vehicleId);
  if (!vehicle) {
    throw createNotFoundError(`Vehicle with ID ${vehicleId} not found`);
  }

  if (!vehicle.device_id) {
    throw createValidationError('Vehicle does not have a device assigned');
  }

  const updated = await vehicleRepo.updateDeviceAssignment(vehicleId, null);
  if (!updated) {
    throw createNotFoundError(`Vehicle with ID ${vehicleId} not found`);
  }

  logger.info(`Device unassigned from vehicle "${vehicle.vehicle_id}"`);
  return sanitizeVehicle(updated);
};
