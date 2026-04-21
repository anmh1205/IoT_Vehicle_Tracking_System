import { createNotFoundError, createConflictError } from '@/shared/utils/errors.util';
import * as driverRepo from '@/domain/driver/repositories/driver.repository';
import { logger } from '@/infrastructure/logger';
import type {
  Driver,
  DriverAssignment,
  CreateDriverInput,
  DriverRecentTrip,
  UpdateDriverInput,
  DriverPublic,
} from '@/domain/driver/types/driver.types';
import { isUndefinedTableError } from '@/shared/utils/postgres-error.util';

const normalizeDriverKey = (value: string | null | undefined) =>
  value?.trim().replace(/\s+/g, ' ').toLowerCase() ?? '';

const toDriverAssignment = (assignment: DriverAssignment | null | undefined) => {
  if (!assignment) {
    return null;
  }

  if (assignment.tripCount === 0 && assignment.activeTripCount === 0 && !assignment.latestTripId) {
    return null;
  }

  return assignment;
};

const sanitizeDriver = (
  d: Driver,
  assignment: DriverAssignment | null = null,
  recentTrips: DriverRecentTrip[] = [],
): DriverPublic => ({
  id: d.id,
  driverCode: d.driver_code,
  fullName: d.full_name,
  phone: d.phone,
  email: d.email,
  licenseNumber: d.license_number,
  licenseType: d.license_type,
  licenseExpiry: d.license_expiry?.toISOString() ?? null,
  dateOfBirth: d.date_of_birth?.toISOString() ?? null,
  address: d.address,
  avatarUrl: d.avatar_url,
  status: d.status,
  notes: d.notes,
  assignment: toDriverAssignment(assignment),
  recentTrips,
  createdAt: d.created_at.toISOString(),
  updatedAt: d.updated_at.toISOString(),
});

export const getDriverById = async (id: number): Promise<DriverPublic> => {
  const driver = await driverRepo.findById(id);
  if (!driver) {
    throw createNotFoundError(`Driver with ID ${id} not found`);
  }

  const driverKey = normalizeDriverKey(driver.full_name);
  let assignment: DriverAssignment | null = null;
  let recentTrips: DriverRecentTrip[] = [];

  try {
    [assignment, recentTrips] = await Promise.all([
      driverRepo.findAssignmentSummaryByName(driverKey),
      driverRepo.findRecentTripsByDriverName(driverKey),
    ]);
  } catch (error) {
    if (!isUndefinedTableError(error)) {
      throw error;
    }
  }

  return sanitizeDriver(driver, assignment, recentTrips);
};

export const createDriver = async (input: CreateDriverInput): Promise<DriverPublic> => {
  const existing = await driverRepo.findByCode(input.driverCode);
  if (existing) {
    throw createConflictError(`Driver with code "${input.driverCode}" already exists`);
  }

  const driver = await driverRepo.create(input);
  logger.info(`Driver "${input.driverCode}" created successfully`);
  return sanitizeDriver(driver);
};

export const updateDriver = async (
  id: number,
  input: UpdateDriverInput,
): Promise<DriverPublic> => {
  const existing = await driverRepo.findById(id);
  if (!existing) {
    throw createNotFoundError(`Driver with ID ${id} not found`);
  }

  const updated = await driverRepo.update(id, input);
  if (!updated) {
    throw createNotFoundError(`Driver with ID ${id} not found`);
  }

  logger.info(`Driver "${existing.driver_code}" updated successfully`);
  return sanitizeDriver(updated);
};

export const deleteDriver = async (id: number): Promise<void> => {
  const existing = await driverRepo.findById(id);
  if (!existing) {
    throw createNotFoundError(`Driver with ID ${id} not found`);
  }

  await driverRepo.remove(id);
  logger.info(`Driver "${existing.driver_code}" deleted successfully`);
};
