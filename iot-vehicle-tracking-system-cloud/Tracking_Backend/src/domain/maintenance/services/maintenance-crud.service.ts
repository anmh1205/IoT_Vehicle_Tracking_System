import { createNotFoundError } from '@/shared/utils/errors.util';
import * as maintenanceRepo from '@/domain/maintenance/repositories/maintenance.repository';
import { logger } from '@/infrastructure/logger';
import { isUndefinedTableError } from '@/shared/utils/postgres-error.util';
import type {
  Maintenance,
  CreateMaintenanceInput,
  UpdateMaintenanceInput,
  MaintenancePublic,
} from '@/domain/maintenance/types/maintenance.types';

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
  let record: Maintenance | null;
  try {
    record = await maintenanceRepo.findById(id);
  } catch (error) {
    if (isUndefinedTableError(error)) {
      throw createNotFoundError('Maintenance module is not initialized');
    }
    throw error;
  }

  if (!record) {
    throw createNotFoundError(`Maintenance record with ID ${id} not found`);
  }
  return sanitizeMaintenance(record);
};

export const createMaintenance = async (
  input: CreateMaintenanceInput,
  createdBy?: number,
): Promise<MaintenancePublic> => {
  let record: Maintenance;
  try {
    record = await maintenanceRepo.create(input, createdBy);
  } catch (error) {
    if (isUndefinedTableError(error)) {
      throw createNotFoundError('Maintenance module is not initialized');
    }
    throw error;
  }
  logger.info(`Maintenance "${input.title}" created for vehicle "${input.vehicleId}"`);
  return sanitizeMaintenance(record);
};

export const updateMaintenance = async (
  id: number,
  input: UpdateMaintenanceInput,
): Promise<MaintenancePublic> => {
  let existing: Maintenance | null;
  try {
    existing = await maintenanceRepo.findById(id);
  } catch (error) {
    if (isUndefinedTableError(error)) {
      throw createNotFoundError('Maintenance module is not initialized');
    }
    throw error;
  }

  if (!existing) {
    throw createNotFoundError(`Maintenance record with ID ${id} not found`);
  }

  let updated: Maintenance | null;
  try {
    updated = await maintenanceRepo.update(id, input);
  } catch (error) {
    if (isUndefinedTableError(error)) {
      throw createNotFoundError('Maintenance module is not initialized');
    }
    throw error;
  }
  if (!updated) {
    throw createNotFoundError(`Maintenance record with ID ${id} not found`);
  }

  logger.info(`Maintenance record ${id} updated successfully`);
  return sanitizeMaintenance(updated);
};

export const deleteMaintenance = async (id: number): Promise<void> => {
  let existing: Maintenance | null;
  try {
    existing = await maintenanceRepo.findById(id);
  } catch (error) {
    if (isUndefinedTableError(error)) {
      throw createNotFoundError('Maintenance module is not initialized');
    }
    throw error;
  }

  if (!existing) {
    throw createNotFoundError(`Maintenance record with ID ${id} not found`);
  }

  try {
    await maintenanceRepo.remove(id);
  } catch (error) {
    if (isUndefinedTableError(error)) {
      throw createNotFoundError('Maintenance module is not initialized');
    }
    throw error;
  }
  logger.info(`Maintenance record ${id} deleted successfully`);
};
