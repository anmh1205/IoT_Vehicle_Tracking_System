import type { Driver, DriverListQuery } from '@/domain/driver/types/driver.types';

vi.mock('@/domain/driver/repositories/driver.repository');

import * as driverRepo from '@/domain/driver/repositories/driver.repository';
import { listDrivers } from './driver-list.service';

// -- Factory ------------------------------------------------------------------

const NOW = new Date('2026-01-15T10:00:00.000Z');
const UPDATED = new Date('2026-01-16T12:00:00.000Z');

const makeDriver = (overrides: Partial<Driver> = {}): Driver => ({
  id: 1,
  driver_code: 'DRV-001',
  full_name: 'Nguyen Van A',
  phone: '0901234567',
  email: 'a@example.com',
  license_number: 'B2-12345',
  license_type: 'B2',
  license_expiry: new Date('2028-06-30T00:00:00.000Z'),
  date_of_birth: new Date('1990-03-20T00:00:00.000Z'),
  address: '123 Le Loi, HCMC',
  avatar_url: null,
  status: 'active',
  notes: null,
  created_at: NOW,
  updated_at: UPDATED,
  ...overrides,
});

// -- Tests --------------------------------------------------------------------

describe('driver-list.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(driverRepo.findAssignmentSummariesByNames).mockResolvedValue(new Map());
  });

  describe('listDrivers', () => {
    it('should return items and pagination with default page=1, limit=20', async () => {
      const drivers = [makeDriver(), makeDriver({ id: 2, driver_code: 'DRV-002' })];
      vi.mocked(driverRepo.findAll).mockResolvedValue({ drivers, total: 2 });

      const query: DriverListQuery = {};
      const result = await listDrivers(query);

      expect(driverRepo.findAll).toHaveBeenCalledWith(query);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
      expect(result.items).toHaveLength(2);
    });

    it('should use provided page and limit values', async () => {
      vi.mocked(driverRepo.findAll).mockResolvedValue({ drivers: [], total: 0 });

      const query: DriverListQuery = { page: 3, limit: 10 };
      const result = await listDrivers(query);

      expect(result.pagination).toEqual({
        page: 3,
        limit: 10,
        total: 0,
        totalPages: 0,
      });
    });

    it('should calculate totalPages correctly with Math.ceil', async () => {
      vi.mocked(driverRepo.findAll).mockResolvedValue({ drivers: [], total: 25 });

      const result = await listDrivers({ page: 1, limit: 10 });

      expect(result.pagination.totalPages).toBe(3);
    });

    it('should sanitize Driver to DriverPublic (snake_case to camelCase)', async () => {
      const driver = makeDriver();
      vi.mocked(driverRepo.findAll).mockResolvedValue({ drivers: [driver], total: 1 });

      const result = await listDrivers({});
      const item = result.items[0];

      expect(item.driverCode).toBe('DRV-001');
      expect(item.fullName).toBe('Nguyen Van A');
      expect(item.licenseNumber).toBe('B2-12345');
      expect(item.licenseType).toBe('B2');
      expect(item.avatarUrl).toBeNull();
      expect(item.assignment).toBeNull();
      expect(item.createdAt).toBe(NOW.toISOString());
      expect(item.updatedAt).toBe(UPDATED.toISOString());
    });

    it('should attach real assignment context when repository provides it', async () => {
      const driver = makeDriver({ full_name: 'Nguyen Van Nam' });
      vi.mocked(driverRepo.findAll).mockResolvedValue({ drivers: [driver], total: 1 });
      vi.mocked(driverRepo.findAssignmentSummariesByNames).mockResolvedValue(
        new Map([
          [
            'nguyen van nam',
            {
              tripCount: 2,
              activeTripCount: 1,
              latestTripId: 9,
              latestTripCode: 'MOCK-TRIP-002',
              latestTripStatus: 'in_progress',
              latestTripAt: '2026-01-16T11:00:00.000Z',
              latestVehicleId: 'XE-BUS-77',
              latestDeviceId: 'MOCK-OBD-002',
              latestStartLocation: 'Depot',
              latestEndLocation: 'Hub',
              activeTripCode: 'MOCK-TRIP-002',
              activeVehicleId: 'XE-BUS-77',
              activeDeviceId: 'MOCK-OBD-002',
            },
          ],
        ]),
      );

      const result = await listDrivers({});

      expect(result.items[0].assignment).toMatchObject({
        tripCount: 2,
        activeTripCount: 1,
        latestVehicleId: 'XE-BUS-77',
      });
    });

    it('should convert Date fields to ISO strings and null dates to null', async () => {
      const driver = makeDriver({ license_expiry: null, date_of_birth: null });
      vi.mocked(driverRepo.findAll).mockResolvedValue({ drivers: [driver], total: 1 });

      const result = await listDrivers({});
      const item = result.items[0];

      expect(item.licenseExpiry).toBeNull();
      expect(item.dateOfBirth).toBeNull();
      expect(typeof item.createdAt).toBe('string');
    });

    it('should return empty items array when no drivers exist', async () => {
      vi.mocked(driverRepo.findAll).mockResolvedValue({ drivers: [], total: 0 });

      const result = await listDrivers({});

      expect(result.items).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });
  });
});
