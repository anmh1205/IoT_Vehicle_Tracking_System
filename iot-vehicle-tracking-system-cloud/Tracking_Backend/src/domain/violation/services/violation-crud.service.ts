import { createNotFoundError, createValidationError } from '@/shared/utils/errors.util';
import * as violationRepo from '@/domain/violation/repositories/violation.repository';
import { logger } from '@/infrastructure/logger';
import { publishEvent } from '@/infrastructure/realtime/event-bus.util';
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
  const result = sanitizeViolation(violation);
  publishEvent('violation:new', {
    id: violation.id,
    alert_id: violation.alert_id,
    vehicle_id: violation.vehicle_id,
    violation_type: violation.violation_type,
    severity: violation.severity,
    created_at: violation.created_at.toISOString(),
  });
  publishEvent('stats:update', {
    reason: 'violation:new',
    violationId: violation.id,
    vehicle_id: violation.vehicle_id,
    timestamp: violation.created_at.toISOString(),
  });

  return result;
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
  const result = sanitizeViolation(updated);
  publishEvent('violation:updated', {
    id: updated.id,
    alert_id: updated.alert_id,
    vehicle_id: updated.vehicle_id,
    action: 'acknowledge',
    acknowledged: updated.acknowledged,
    updated_at: updated.updated_at.toISOString(),
  });
  publishEvent('stats:update', {
    reason: 'violation:updated',
    violationId: updated.id,
    vehicle_id: updated.vehicle_id,
    timestamp: updated.updated_at.toISOString(),
  });

  return result;
};
