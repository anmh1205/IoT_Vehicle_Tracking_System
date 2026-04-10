import type { Driver, CreateDriverInput, UpdateDriverInput } from '@/domain/driver/types/driver.types';

vi.mock('@/domain/driver/repositories/driver.repository');
vi.mock('@/infrastructure/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import * as driverRepo from '@/domain/driver/repositories/driver.repository';
import { getDriverById, createDriver, updateDriver, deleteDriver } from './driver-crud.service';

// -- Factory ------------------------------------------------------------------

const NOW = new Date('2026-01-15T10:00:00.000Z');
const UPDATED = new Date('2026-01-16T12:00:00.000Z');
const LICENSE_EXPIRY = new Date('2028-06-30T00:00:00.000Z');
const DOB = new Date('1990-03-20T00:00:00.000Z');

const makeDriver = (overrides: Partial<Driver> = {}): Driver => ({
  id: 1,
  driver_code: 'DRV-001',
  full_name: 'Nguyen Van A',
  phone: '0901234567',
  email: 'a@example.com',
  license_number: 'B2-12345',
  license_type: 'B2',
  license_expiry: LICENSE_EXPIRY,
  date_of_birth: DOB,
  address: '123 Le Loi, HCMC',
  avatar_url: null,
  status: 'active',
  notes: null,
  created_at: NOW,
  updated_at: UPDATED,
  ...overrides,
});

// -- Tests --------------------------------------------------------------------

describe('driver-crud.service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // --- getDriverById ---------------------------------------------------------

  describe('getDriverById', () => {
    it('should return a sanitized DriverPublic when the driver exists', async () => {
      const driver = makeDriver();
      vi.mocked(driverRepo.findById).mockResolvedValue(driver);

      const result = await getDriverById(1);

      expect(driverRepo.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual({
        id: 1,
        driverCode: 'DRV-001',
        fullName: 'Nguyen Van A',
        phone: '0901234567',
        email: 'a@example.com',
        licenseNumber: 'B2-12345',
        licenseType: 'B2',
        licenseExpiry: LICENSE_EXPIRY.toISOString(),
        dateOfBirth: DOB.toISOString(),
        address: '123 Le Loi, HCMC',
        avatarUrl: null,
        status: 'active',
        notes: null,
        createdAt: NOW.toISOString(),
        updatedAt: UPDATED.toISOString(),
      });
    });

    it('should convert null date fields to null in the output', async () => {
      const driver = makeDriver({ license_expiry: null, date_of_birth: null });
      vi.mocked(driverRepo.findById).mockResolvedValue(driver);

      const result = await getDriverById(1);

      expect(result.licenseExpiry).toBeNull();
      expect(result.dateOfBirth).toBeNull();
    });

    it('should throw a 404 ApiError when the driver is not found', async () => {
      vi.mocked(driverRepo.findById).mockResolvedValue(null);

      await expect(getDriverById(999)).rejects.toMatchObject({
        name: 'ApiError',
        status: 404,
        message: 'Driver with ID 999 not found',
      });
    });
  });

  // --- createDriver ----------------------------------------------------------

  describe('createDriver', () => {
    const input: CreateDriverInput = {
      driverCode: 'DRV-002',
      fullName: 'Tran Van B',
      phone: '0912345678',
    };

    it('should check for duplicate code and create a new driver', async () => {
      vi.mocked(driverRepo.findByCode).mockResolvedValue(null);
      vi.mocked(driverRepo.create).mockResolvedValue(
        makeDriver({ id: 2, driver_code: 'DRV-002', full_name: 'Tran Van B' }),
      );

      const result = await createDriver(input);

      expect(driverRepo.findByCode).toHaveBeenCalledWith('DRV-002');
      expect(driverRepo.create).toHaveBeenCalledWith(input);
      expect(result.id).toBe(2);
      expect(result.driverCode).toBe('DRV-002');
      expect(result.fullName).toBe('Tran Van B');
    });

    it('should throw a 409 ApiError when driver code already exists', async () => {
      vi.mocked(driverRepo.create).mockClear();
      vi.mocked(driverRepo.findByCode).mockResolvedValue(makeDriver());

      await expect(createDriver(input)).rejects.toMatchObject({
        name: 'ApiError',
        status: 409,
        message: 'Driver with code "DRV-002" already exists',
      });

      expect(driverRepo.create).not.toHaveBeenCalled();
    });
  });

  // --- updateDriver ----------------------------------------------------------

  describe('updateDriver', () => {
    const input: UpdateDriverInput = { fullName: 'Nguyen Van A Updated' };

    it('should update and return the sanitized driver', async () => {
      vi.mocked(driverRepo.findById).mockResolvedValue(makeDriver());
      vi.mocked(driverRepo.update).mockResolvedValue(
        makeDriver({ full_name: 'Nguyen Van A Updated' }),
      );

      const result = await updateDriver(1, input);

      expect(driverRepo.findById).toHaveBeenCalledWith(1);
      expect(driverRepo.update).toHaveBeenCalledWith(1, input);
      expect(result.fullName).toBe('Nguyen Van A Updated');
    });

    it('should throw a 404 ApiError when the driver does not exist', async () => {
      vi.mocked(driverRepo.update).mockClear();
      vi.mocked(driverRepo.findById).mockResolvedValue(null);

      await expect(updateDriver(999, input)).rejects.toMatchObject({
        name: 'ApiError',
        status: 404,
      });

      expect(driverRepo.update).not.toHaveBeenCalled();
    });

    it('should throw a 404 ApiError when repo.update returns null', async () => {
      vi.mocked(driverRepo.findById).mockResolvedValue(makeDriver());
      vi.mocked(driverRepo.update).mockResolvedValue(null);

      await expect(updateDriver(1, input)).rejects.toMatchObject({
        name: 'ApiError',
        status: 404,
      });
    });
  });

  // --- deleteDriver ----------------------------------------------------------

  describe('deleteDriver', () => {
    it('should delete the driver when it exists', async () => {
      vi.mocked(driverRepo.findById).mockResolvedValue(makeDriver());
      vi.mocked(driverRepo.remove).mockResolvedValue(true);

      await deleteDriver(1);

      expect(driverRepo.findById).toHaveBeenCalledWith(1);
      expect(driverRepo.remove).toHaveBeenCalledWith(1);
    });

    it('should throw a 404 ApiError when the driver does not exist', async () => {
      vi.mocked(driverRepo.remove).mockClear();
      vi.mocked(driverRepo.findById).mockResolvedValue(null);

      await expect(deleteDriver(999)).rejects.toMatchObject({
        name: 'ApiError',
        status: 404,
      });

      expect(driverRepo.remove).not.toHaveBeenCalled();
    });
  });
});
