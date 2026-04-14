import * as driverRepo from '@/domain/driver/repositories/driver.repository';
import type {
  Driver,
  DriverListQuery,
  DriverPublic,
} from '@/domain/driver/types/driver.types';
import { isUndefinedTableError } from '@/shared/utils/postgres-error.util';

const sanitizeDriver = (d: Driver): DriverPublic => ({
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

  return {
    items: result.drivers.map(sanitizeDriver),
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
    },
  };
};
