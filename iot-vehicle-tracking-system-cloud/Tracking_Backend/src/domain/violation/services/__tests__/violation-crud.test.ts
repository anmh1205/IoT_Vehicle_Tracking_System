import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  Violation,
  CreateViolationInput,
  AcknowledgeViolationInput,
} from '@/domain/violation/types/violation.types';

vi.mock('@/domain/violation/repositories/violation.repository');
vi.mock('@/infrastructure/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import * as violationRepo from '@/domain/violation/repositories/violation.repository';
import {
  getViolationById,
  createViolation,
  acknowledgeViolation,
} from '../violation-crud.service';

// -- Factory ------------------------------------------------------------------

const NOW = new Date('2026-01-15T10:00:00.000Z');
const UPDATED = new Date('2026-01-16T12:00:00.000Z');

const makeViolation = (overrides: Partial<Violation> = {}): Violation => ({
  id: 1,
  alert_id: null,
  vehicle_id: 'VH-001',
  driver_id: null,
  violation_type: 'speeding',
  severity: 'high',
  description: 'Exceeded speed limit',
  location_lat: 10.7769,
  location_lon: 106.7009,
  speed_limit: 60,
  actual_speed: 90,
  fine_amount: 500000,
  acknowledged: false,
  acknowledged_by: null,
  acknowledged_at: null,
  notes: null,
  created_at: NOW,
  updated_at: UPDATED,
  ...overrides,
});

// -- Tests --------------------------------------------------------------------

describe('violation-crud.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- getViolationById -------------------------------------------------------

  describe('getViolationById', () => {
    it('should return sanitized ViolationPublic when violation exists', async () => {
      const violation = makeViolation();
      vi.mocked(violationRepo.findById).mockResolvedValue(violation);

      const result = await getViolationById(1);

      expect(violationRepo.findById).toHaveBeenCalledWith(1);
      expect(result).toMatchObject({
        id: 1,
        vehicleId: 'VH-001',
        violationType: 'speeding',
        severity: 'high',
        acknowledged: false,
        acknowledgedBy: null,
        acknowledgedAt: null,
        createdAt: NOW.toISOString(),
        updatedAt: UPDATED.toISOString(),
      });
    });

    it('should convert acknowledged_at Date to ISO string when present', async () => {
      const ackDate = new Date('2026-01-17T08:00:00.000Z');
      const violation = makeViolation({ acknowledged: true, acknowledged_at: ackDate, acknowledged_by: 5 });
      vi.mocked(violationRepo.findById).mockResolvedValue(violation);

      const result = await getViolationById(1);

      expect(result.acknowledgedAt).toBe(ackDate.toISOString());
      expect(result.acknowledgedBy).toBe(5);
    });

    it('should throw 404 ApiError when violation not found', async () => {
      vi.mocked(violationRepo.findById).mockResolvedValue(null);

      await expect(getViolationById(999)).rejects.toMatchObject({
        name: 'ApiError',
        status: 404,
        message: 'Violation with ID 999 not found',
      });
    });
  });

  // --- createViolation -------------------------------------------------------

  describe('createViolation', () => {
    const input: CreateViolationInput = {
      vehicleId: 'VH-001',
      violationType: 'speeding',
      severity: 'high',
      locationLat: 10.7769,
      locationLon: 106.7009,
      speedLimit: 60,
      actualSpeed: 90,
    };

    it('should call repo.create and return sanitized violation', async () => {
      const created = makeViolation();
      vi.mocked(violationRepo.create).mockResolvedValue(created);

      const result = await createViolation(input);

      expect(violationRepo.create).toHaveBeenCalledWith(input);
      expect(result.id).toBe(1);
      expect(result.violationType).toBe('speeding');
      expect(result.vehicleId).toBe('VH-001');
    });

    it('should sanitize all fields to camelCase in returned object', async () => {
      vi.mocked(violationRepo.create).mockResolvedValue(makeViolation());

      const result = await createViolation(input);

      expect(result).toHaveProperty('alertId');
      expect(result).toHaveProperty('driverId');
      expect(result).toHaveProperty('locationLat');
      expect(result).toHaveProperty('locationLon');
      expect(result).toHaveProperty('speedLimit');
      expect(result).toHaveProperty('actualSpeed');
      expect(result).toHaveProperty('fineAmount');
    });
  });

  // --- acknowledgeViolation --------------------------------------------------

  describe('acknowledgeViolation', () => {
    const ackInput: AcknowledgeViolationInput = { notes: 'Reviewed by admin' };

    it('should update and return sanitized violation when not yet acknowledged', async () => {
      const existing = makeViolation({ acknowledged: false });
      const ackDate = new Date('2026-01-17T09:00:00.000Z');
      const updated = makeViolation({
        acknowledged: true,
        acknowledged_by: 10,
        acknowledged_at: ackDate,
        notes: 'Reviewed by admin',
      });

      vi.mocked(violationRepo.findById).mockResolvedValue(existing);
      vi.mocked(violationRepo.acknowledge).mockResolvedValue(updated);

      const result = await acknowledgeViolation(1, 10, ackInput);

      expect(violationRepo.findById).toHaveBeenCalledWith(1);
      expect(violationRepo.acknowledge).toHaveBeenCalledWith(1, 10, ackInput);
      expect(result.acknowledged).toBe(true);
      expect(result.acknowledgedBy).toBe(10);
      expect(result.acknowledgedAt).toBe(ackDate.toISOString());
    });

    it('should throw 400 ApiError when violation already acknowledged', async () => {
      vi.mocked(violationRepo.findById).mockResolvedValue(
        makeViolation({ acknowledged: true }),
      );

      await expect(acknowledgeViolation(1, 10, ackInput)).rejects.toMatchObject({
        name: 'ApiError',
        status: 400,
      });

      expect(violationRepo.acknowledge).not.toHaveBeenCalled();
    });

    it('should throw 404 ApiError when violation not found', async () => {
      vi.mocked(violationRepo.findById).mockResolvedValue(null);

      await expect(acknowledgeViolation(999, 10, ackInput)).rejects.toMatchObject({
        name: 'ApiError',
        status: 404,
        message: 'Violation with ID 999 not found',
      });
    });

    it('should throw 404 when repo.acknowledge returns null', async () => {
      vi.mocked(violationRepo.findById).mockResolvedValue(makeViolation({ acknowledged: false }));
      vi.mocked(violationRepo.acknowledge).mockResolvedValue(null);

      await expect(acknowledgeViolation(1, 10, ackInput)).rejects.toMatchObject({
        name: 'ApiError',
        status: 404,
      });
    });
  });
});
