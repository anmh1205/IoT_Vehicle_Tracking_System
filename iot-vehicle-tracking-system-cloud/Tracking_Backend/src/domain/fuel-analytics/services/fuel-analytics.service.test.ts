import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  FuelSummary,
  VehicleFuelData,
  FuelTrend,
} from '@/domain/fuel-analytics/types/fuel-analytics.types';

vi.mock('@/domain/fuel-analytics/repositories/fuel-analytics.repository');

import * as fuelRepo from '@/domain/fuel-analytics/repositories/fuel-analytics.repository';
import { getFuelSummary, getFuelByVehicle, getFuelTrends } from './fuel-analytics.service';

// -- Factories ----------------------------------------------------------------

const makeSummary = (overrides: Partial<FuelSummary> = {}): FuelSummary => ({
  totalFuelUsed: 150.5,
  totalDistance: 2000,
  avgConsumption: 7.53,
  totalCost: 0,
  tripCount: 12,
  ...overrides,
});

const makeVehicleFuel = (overrides: Partial<VehicleFuelData> = {}): VehicleFuelData => ({
  vehicleId: 'VH-001',
  plateNumber: '51A-12345',
  totalFuel: 80.25,
  totalDistance: 1200,
  avgConsumption: 6.69,
  tripCount: 5,
  ...overrides,
});

const makeTrend = (overrides: Partial<FuelTrend> = {}): FuelTrend => ({
  date: '2026-01-01T00:00:00.000Z',
  fuelUsed: 20.5,
  distance: 300,
  consumption: 6.83,
  ...overrides,
});

// -- Tests --------------------------------------------------------------------

describe('fuel-analytics.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- getFuelSummary --------------------------------------------------------

  describe('getFuelSummary', () => {
    it('should return summary with totalCost calculated from totalFuelUsed * fuelPrice', async () => {
      vi.mocked(fuelRepo.getSummary).mockResolvedValue(makeSummary({ totalFuelUsed: 100 }));

      const result = await getFuelSummary({
        from: '2026-01-01',
        to: '2026-01-31',
      });

      expect(fuelRepo.getSummary).toHaveBeenCalledTimes(1);
      expect(result.totalCost).toBe(100 * 25000);
      expect(result.totalFuelUsed).toBe(100);
    });

    it('should use custom fuelPrice when provided', async () => {
      vi.mocked(fuelRepo.getSummary).mockResolvedValue(makeSummary({ totalFuelUsed: 50 }));

      const result = await getFuelSummary({
        from: '2026-01-01',
        to: '2026-01-31',
        fuelPrice: 30000,
      });

      expect(result.totalCost).toBe(50 * 30000);
    });

    it('should use default 30-day range when no dates are provided', async () => {
      vi.mocked(fuelRepo.getSummary).mockResolvedValue(makeSummary());

      await getFuelSummary({});

      const call = vi.mocked(fuelRepo.getSummary).mock.calls[0][0];
      const diffMs = call.to.getTime() - call.from.getTime();
      const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
      expect(diffDays).toBe(30);
    });

    it('should throw a validation error for an invalid "from" date', async () => {
      await expect(
        getFuelSummary({ from: 'not-a-date', to: '2026-01-31' }),
      ).rejects.toMatchObject({
        name: 'ApiError',
        status: 400,
        message: 'Invalid date value: not-a-date',
      });
    });

    it('should throw a validation error for an invalid "to" date', async () => {
      await expect(
        getFuelSummary({ from: '2026-01-01', to: 'invalid' }),
      ).rejects.toMatchObject({
        name: 'ApiError',
        status: 400,
        message: 'Invalid date value: invalid',
      });
    });

    it('should throw a validation error when "from" is after "to"', async () => {
      await expect(
        getFuelSummary({ from: '2026-02-01', to: '2026-01-01' }),
      ).rejects.toMatchObject({
        name: 'ApiError',
        status: 400,
        message: '"from" must be earlier than or equal to "to"',
      });
    });
  });

  // --- getFuelByVehicle ------------------------------------------------------

  describe('getFuelByVehicle', () => {
    it('should parse date range and return vehicles array', async () => {
      const vehicles = [makeVehicleFuel(), makeVehicleFuel({ vehicleId: 'VH-002' })];
      vi.mocked(fuelRepo.getByVehicle).mockResolvedValue(vehicles);

      const result = await getFuelByVehicle({
        from: '2026-01-01',
        to: '2026-01-31',
      });

      expect(fuelRepo.getByVehicle).toHaveBeenCalledTimes(1);
      expect(result.vehicles).toHaveLength(2);
      expect(result.vehicles[0].vehicleId).toBe('VH-001');
    });

    it('should use default date range when no dates are provided', async () => {
      vi.mocked(fuelRepo.getByVehicle).mockResolvedValue([]);

      await getFuelByVehicle({});

      expect(fuelRepo.getByVehicle).toHaveBeenCalledTimes(1);
      const call = vi.mocked(fuelRepo.getByVehicle).mock.calls[0][0];
      expect(call.from).toBeInstanceOf(Date);
      expect(call.to).toBeInstanceOf(Date);
    });

    it('should throw a validation error for an invalid date', async () => {
      await expect(
        getFuelByVehicle({ from: 'bad-date' }),
      ).rejects.toMatchObject({
        name: 'ApiError',
        status: 400,
      });
    });
  });

  // --- getFuelTrends ---------------------------------------------------------

  describe('getFuelTrends', () => {
    it('should parse range and interval, returning trends array', async () => {
      const trends = [makeTrend(), makeTrend({ date: '2026-01-02T00:00:00.000Z' })];
      vi.mocked(fuelRepo.getTrends).mockResolvedValue(trends);

      const result = await getFuelTrends({
        from: '2026-01-01',
        to: '2026-01-31',
        interval: 'day',
      });

      expect(fuelRepo.getTrends).toHaveBeenCalledWith(
        expect.objectContaining({ from: expect.any(Date), to: expect.any(Date) }),
        'day',
      );
      expect(result.trends).toHaveLength(2);
    });

    it('should accept "week" interval', async () => {
      vi.mocked(fuelRepo.getTrends).mockResolvedValue([]);

      await getFuelTrends({ from: '2026-01-01', to: '2026-01-31', interval: 'week' });

      expect(fuelRepo.getTrends).toHaveBeenCalledWith(expect.any(Object), 'week');
    });

    it('should accept "month" interval', async () => {
      vi.mocked(fuelRepo.getTrends).mockResolvedValue([]);

      await getFuelTrends({ from: '2026-01-01', to: '2026-01-31', interval: 'month' });

      expect(fuelRepo.getTrends).toHaveBeenCalledWith(expect.any(Object), 'month');
    });

    it('should default to "day" interval when not provided', async () => {
      vi.mocked(fuelRepo.getTrends).mockResolvedValue([]);

      await getFuelTrends({ from: '2026-01-01', to: '2026-01-31' });

      expect(fuelRepo.getTrends).toHaveBeenCalledWith(expect.any(Object), 'day');
    });

    it('should throw a validation error for an invalid interval', async () => {
      await expect(
        getFuelTrends({ from: '2026-01-01', to: '2026-01-31', interval: 'year' }),
      ).rejects.toMatchObject({
        name: 'ApiError',
        status: 400,
        message: 'Invalid interval. Allowed values: day, week, month',
      });
    });

    it('should throw a validation error when "from" is after "to"', async () => {
      await expect(
        getFuelTrends({ from: '2026-12-01', to: '2026-01-01', interval: 'day' }),
      ).rejects.toMatchObject({
        name: 'ApiError',
        status: 400,
      });
    });
  });
});
