import { createNotFoundError, createValidationError } from '@/shared/utils/errors.util';
import * as alertRepo from '@/domain/alert/repositories/alert.repository';
import { logger } from '@/infrastructure/logger';
import { publishEvent } from '@/infrastructure/realtime';
import * as auditLog from '@/domain/audit/services/audit-log.service';
import type { Alert, CreateAlertInput, AlertPublic } from '@/domain/alert/types/alert.types';

const sanitizeAlert = (a: Alert): AlertPublic => ({
  id: a.id,
  vehicleId: a.vehicle_id,
  deviceId: a.device_id,
  tripId: a.trip_id,
  geofenceId: a.geofence_id,
  alertType: a.alert_type,
  severity: a.severity,
  status: a.status,
  title: a.title,
  message: a.message,
  latitude: a.latitude,
  longitude: a.longitude,
  speed: a.speed,
  thresholdValue: a.threshold_value,
  actualValue: a.actual_value,
  acknowledgedBy: a.acknowledged_by,
  acknowledgedAt: a.acknowledged_at?.toISOString() ?? null,
  resolvedBy: a.resolved_by,
  resolvedAt: a.resolved_at?.toISOString() ?? null,
  resolutionNotes: a.resolution_notes,
  createdAt: a.created_at.toISOString(),
  updatedAt: a.updated_at.toISOString(),
});

export const getAlertById = async (id: number): Promise<AlertPublic> => {
  const alert = await alertRepo.findById(id);
  if (!alert) {
    throw createNotFoundError(`Alert with ID ${id} not found`);
  }
  return sanitizeAlert(alert);
};

export const createAlert = async (input: CreateAlertInput): Promise<AlertPublic> => {
  const alert = await alertRepo.create(input);
  logger.info(`Alert "${input.title}" created with severity "${input.severity}"`);

  const result = sanitizeAlert(alert);

  publishEvent('dashboard.alert.created', {
    id: alert.id,
    vehicle_id: alert.vehicle_id ? Number(alert.vehicle_id) : undefined,
    device_id: alert.device_id ?? undefined,
    alert_type: alert.alert_type,
    severity: alert.severity,
    title: alert.title,
    message: alert.message ?? undefined,
    latitude: alert.latitude ?? undefined,
    longitude: alert.longitude ?? undefined,
  });

  publishEvent('dashboard.activity.created', {
    id: alert.id,
    type: 'alert',
    message: `New ${alert.severity} alert: ${alert.title}`,
    timestamp: alert.created_at.toISOString(),
  });

  return result;
};

export const acknowledgeAlert = async (id: number, userId: number): Promise<AlertPublic> => {
  const existing = await alertRepo.findById(id);
  if (!existing) {
    throw createNotFoundError(`Alert with ID ${id} not found`);
  }

  if (existing.status !== 'active') {
    throw createValidationError(
      `Alert can only be acknowledged from "active" status, current status is "${existing.status}"`,
    );
  }

  const updated = await alertRepo.acknowledge(id, userId);
  if (!updated) {
    throw createNotFoundError(`Alert with ID ${id} not found`);
  }

  logger.info(`Alert ${id} acknowledged by user ${userId}`);

  void auditLog.record({
    userId,
    action: 'acknowledge',
    entityType: 'alert',
    entityId: String(id),
  });

  return sanitizeAlert(updated);
};

export const resolveAlert = async (
  id: number,
  userId: number,
  resolutionNotes: string | null,
): Promise<AlertPublic> => {
  const existing = await alertRepo.findById(id);
  if (!existing) {
    throw createNotFoundError(`Alert with ID ${id} not found`);
  }

  if (existing.status !== 'active' && existing.status !== 'acknowledged') {
    throw createValidationError(
      `Alert can only be resolved from "active" or "acknowledged" status, current status is "${existing.status}"`,
    );
  }

  const updated = await alertRepo.resolve(id, userId, resolutionNotes);
  if (!updated) {
    throw createNotFoundError(`Alert with ID ${id} not found`);
  }

  logger.info(`Alert ${id} resolved by user ${userId}`);

  void auditLog.record({
    userId,
    action: 'resolve',
    entityType: 'alert',
    entityId: String(id),
  });

  return sanitizeAlert(updated);
};

export const dismissAlert = async (id: number): Promise<AlertPublic> => {
  const existing = await alertRepo.findById(id);
  if (!existing) {
    throw createNotFoundError(`Alert with ID ${id} not found`);
  }

  if (existing.status === 'resolved') {
    throw createValidationError('Cannot dismiss a resolved alert');
  }

  const updated = await alertRepo.dismiss(id);
  if (!updated) {
    throw createNotFoundError(`Alert with ID ${id} not found`);
  }

  logger.info(`Alert ${id} dismissed`);
  return sanitizeAlert(updated);
};

export const deleteAlert = async (id: number): Promise<void> => {
  const existing = await alertRepo.findById(id);
  if (!existing) {
    throw createNotFoundError(`Alert with ID ${id} not found`);
  }

  await alertRepo.remove(id);
  logger.info(`Alert ${id} deleted`);
};
