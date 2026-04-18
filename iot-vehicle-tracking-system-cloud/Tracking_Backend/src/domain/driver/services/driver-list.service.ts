import * as driverRepo from '@/domain/driver/repositories/driver.repository';
import type {
  Driver,
  DriverAssignment,
  DriverListQuery,
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
  createdAt: d.created_at.toISOString(),
  updatedAt: d.updated_at.toISOString(),
});

export const listDrivers = async (
  query: DriverListQuery,
): Promise<{
  items: DriverPublic[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  let result: { drivers: Driver[]; total: number };
  let assignments = new Map<string, DriverAssignment>();

  try {
    result = await driverRepo.findAll(query);
  } catch (error) {
    if (isUndefinedTableError(error)) {
      return {
        items: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      };
    }
    throw error;
  }

  try {
    const driverKeys = Array.from(
      new Set(result.drivers.map((driver) => normalizeDriverKey(driver.full_name)).filter(Boolean)),
    );
    assignments = await driverRepo.findAssignmentSummariesByNames(driverKeys);
  } catch (error) {
    if (!isUndefinedTableError(error)) {
      throw error;
    }
  }

  return {
    items: result.drivers.map((driver) =>
      sanitizeDriver(driver, assignments.get(normalizeDriverKey(driver.full_name)) ?? null),
    ),
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
    },
  };
};
