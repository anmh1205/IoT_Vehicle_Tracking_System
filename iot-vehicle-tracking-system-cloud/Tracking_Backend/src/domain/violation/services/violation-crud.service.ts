import { createNotFoundError, createValidationError } from '@/shared/utils/errors.util';
import * as violationRepo from '@/domain/violation/repositories/violation.repository';
import { logger } from '@/infrastructure/logger';
import type {
  Violation,
  ViolationPublic,
  CreateViolationInput,
  AcknowledgeViolationInput,
} from '@/domain/violation/types/violation.types';

export const sanitizeViolation = (v: Violation): ViolationPublic => ({
  id: v.id,
  alertId: v.alert_id,
  vehicleId: v.vehicle_id,
  driverId: v.driver_id,
  violationType: v.violation_type,
  severity: v.severity,
  description: v.description,
  locationLat: v.location_lat,
  locationLon: v.location_lon,
  speedLimit: v.speed_limit,
  actualSpeed: v.actual_speed,
  fineAmount: v.fine_amount,
  acknowledged: v.acknowledged,
  acknowledgedBy: v.acknowledged_by,
  acknowledgedAt: v.acknowledged_at?.toISOString() ?? null,
  notes: v.notes,
  createdAt: v.created_at.toISOString(),
  updatedAt: v.updated_at.toISOString(),
});

export const getViolationById = async (id: number): Promise<ViolationPublic> => {
  const violation = await violationRepo.findById(id);
  if (!violation) {
    throw createNotFoundError(`Violation with ID ${id} not found`);
  }
  return sanitizeViolation(violation);
};

export const createViolation = async (input: CreateViolationInput): Promise<ViolationPublic> => {
  const violation = await violationRepo.create(input);
  logger.info(`Violation "${input.violationType}" created for vehicle "${input.vehicleId}"`);
  return sanitizeViolation(violation);
};

export const acknowledgeViolation = async (
  id: number,
  userId: number,
  data: AcknowledgeViolationInput,
): Promise<ViolationPublic> => {
  const existing = await violationRepo.findById(id);
  if (!existing) {
    throw createNotFoundError(`Violation with ID ${id} not found`);
  }

  if (existing.acknowledged) {
    throw createValidationError(`Violation ${id} has already been acknowledged`);
  }

  const updated = await violationRepo.acknowledge(id, userId, data);
  if (!updated) {
    throw createNotFoundError(`Violation with ID ${id} not found`);
  }

  logger.info(`Violation ${id} acknowledged by user ${userId}`);
  return sanitizeViolation(updated);
};
