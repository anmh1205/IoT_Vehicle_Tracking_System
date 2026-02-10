import { createNotFoundError } from '@/shared/utils/errors.util';
import * as maintenanceRepo from '@/domain/maintenance/repositories/maintenance.repository';
import { logger } from '@/infrastructure/logger';
import type { Maintenance, CreateMaintenanceInput, UpdateMaintenanceInput, MaintenancePublic } from '@/domain/maintenance/types/maintenance.types';

const sanitizeMaintenance = (m: Maintenance): MaintenancePublic => ({
  id: m.id,
  vehicleId: m.vehicle_id,
  maintenanceType: m.maintenance_type,
  title: m.title,
  description: m.description,
  scheduledDate: m.scheduled_date?.toISOString() ?? null,
  completedDate: m.completed_date?.toISOString() ?? null,
  mileageAtService: m.mileage_at_service,
  nextServiceMileage: m.next_service_mileage,
  nextServiceDate: m.next_service_date?.toISOString() ?? null,
  cost: m.cost,
  serviceProvider: m.service_provider,
  status: m.status,
  notes: m.notes,
  createdBy: m.created_by,
  createdAt: m.created_at.toISOString(),
  updatedAt: m.updated_at.toISOString(),
});

export const getMaintenanceById = async (id: number): Promise<MaintenancePublic> => {
  const record = await maintenanceRepo.findById(id);
  if (!record) {
    throw createNotFoundError(`Maintenance record with ID ${id} not found`);
  }
  return sanitizeMaintenance(record);
};

export const createMaintenance = async (input: CreateMaintenanceInput, createdBy?: number): Promise<MaintenancePublic> => {
  const record = await maintenanceRepo.create(input, createdBy);
  logger.info(`Maintenance "${input.title}" created for vehicle "${input.vehicleId}"`);
  return sanitizeMaintenance(record);
};

export const updateMaintenance = async (id: number, input: UpdateMaintenanceInput): Promise<MaintenancePublic> => {
  const existing = await maintenanceRepo.findById(id);
  if (!existing) {
    throw createNotFoundError(`Maintenance record with ID ${id} not found`);
  }

  const updated = await maintenanceRepo.update(id, input);
  if (!updated) {
    throw createNotFoundError(`Maintenance record with ID ${id} not found`);
  }

  logger.info(`Maintenance record ${id} updated successfully`);
  return sanitizeMaintenance(updated);
};

export const deleteMaintenance = async (id: number): Promise<void> => {
  const existing = await maintenanceRepo.findById(id);
  if (!existing) {
    throw createNotFoundError(`Maintenance record with ID ${id} not found`);
  }

  await maintenanceRepo.remove(id);
  logger.info(`Maintenance record ${id} deleted successfully`);
};
