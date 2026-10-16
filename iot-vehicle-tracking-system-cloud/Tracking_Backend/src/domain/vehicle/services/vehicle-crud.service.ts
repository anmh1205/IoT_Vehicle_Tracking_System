import { createNotFoundError, createConflictError, createForbiddenError } from '@/shared/utils/errors.util';
import * as vehicleRepo from '@/domain/vehicle/repositories/vehicle.repository';
import type { VehicleAccessScope } from '@/domain/vehicle/repositories/vehicle.repository';
import { logger } from '@/infrastructure/logger';
import * as auditLog from '@/domain/audit/services/audit-log.service';
import type {
  Vehicle,
  CreateVehicleInput,
  UpdateVehicleInput,
  VehiclePublic,
} from '@/domain/vehicle/types/vehicle.types';

const sanitizeVehicle = (v: Vehicle): VehiclePublic => ({
  id: v.id,
  vehicleId: v.vehicle_id,
  plateNumber: v.plate_number,
  deviceId: v.device_id,
  customerId: v.customer_id,
  customerCode: v.customer_code ?? null,
  customerName: v.customer_name ?? null,
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

export const getVehicleById = async (id: number, scope: VehicleAccessScope): Promise<VehiclePublic> => {
  const vehicle = await vehicleRepo.findByIdForScope(id, scope);
  if (!vehicle) {
    throw createNotFoundError(`Vehicle with ID ${id} not found`);
  }
  return sanitizeVehicle(vehicle);
};

export const createVehicle = async (input: CreateVehicleInput): Promise<VehiclePublic> => {
  const existing = await vehicleRepo.findByVehicleId(input.vehicleId);
  if (existing) {
    throw createConflictError(`Vehicle with ID "${input.vehicleId}" already exists`);
  }

  const vehicle = await vehicleRepo.create(input);
  logger.info(`Vehicle "${input.vehicleId}" created successfully`);

  void auditLog.record({
    userId: 0,
    action: 'create',
    entityType: 'vehicle',
    entityId: String(vehicle.id),
  });

  const created = await vehicleRepo.findById(vehicle.id);
  return sanitizeVehicle(created ?? vehicle);
};

export const updateVehicle = async (
  id: number,
  input: UpdateVehicleInput,
  scope: VehicleAccessScope,
): Promise<VehiclePublic> => {
  // No scoped customer ownership model exists yet; prevent assigning an
  // arbitrary cross-fleet customer or switching device identity.
  if (!vehicleRepo.vehicleScopeIsGlobal(scope) &&
      (input.deviceId !== undefined || input.customerId !== undefined)) {
    throw createForbiddenError('Only administrators can change vehicle ownership associations');
  }
  const existing = await vehicleRepo.findByIdForScope(id, scope);
  if (!existing) {
    throw createNotFoundError(`Vehicle with ID ${id} not found`);
  }

  const updated = await vehicleRepo.update(id, input, scope);
  if (!updated) {
    throw createNotFoundError(`Vehicle with ID ${id} not found`);
  }

  logger.info(`Vehicle "${existing.vehicle_id}" updated successfully`);

  void auditLog.record({
    userId: 0,
    action: 'update',
    entityType: 'vehicle',
    entityId: String(id),
  });

  const hydrated = await vehicleRepo.findByIdForScope(id, scope);
  return sanitizeVehicle(hydrated ?? updated);
};

export const deleteVehicle = async (id: number): Promise<void> => {
  const existing = await vehicleRepo.findById(id);
  if (!existing) {
    throw createNotFoundError(`Vehicle with ID ${id} not found`);
  }

  await vehicleRepo.remove(id);
  logger.info(`Vehicle "${existing.vehicle_id}" deleted successfully`);

  void auditLog.record({
    userId: 0,
    action: 'delete',
    entityType: 'vehicle',
    entityId: String(id),
  });
};
