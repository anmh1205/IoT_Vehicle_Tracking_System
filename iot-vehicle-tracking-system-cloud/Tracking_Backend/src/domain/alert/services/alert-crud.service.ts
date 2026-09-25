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
  vehiclePlate: a.vehicle_plate ?? null,
  customerName: a.customer_name ?? null,
  deviceName: a.device_name ?? null,
  tripId: a.trip_id,
  geofenceId: a.geofence_id,
  tripCode: a.trip_code ?? null,
  geofenceName: a.geofence_name ?? null,
  alertType: a.alert_type,
  source: a.source,
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

const toNotificationType = (alertType: string): string => {
  const normalized = alertType.toLowerCase();
  if (normalized.includes('zone') || normalized.includes('geofence')) return 'zone';
  if (normalized.includes('firmware')) return 'firmware';
  if (normalized.includes('export')) return 'export';
  if (
    normalized.includes('system') ||
    normalized.includes('offline') ||
    normalized.includes('database') ||
    normalized.includes('service')
  ) {
    return 'system';
  }
  return 'alert';
};

export const getAlertById = async (id: number): Promise<AlertPublic> => {
  const alert = await alertRepo.findById(id);
  if (!alert) {
    throw createNotFoundError(`Alert with ID ${id} not found`);
  }
  return sanitizeAlert(alert);
};

export const createAlert = async (input: CreateAlertInput): Promise<AlertPublic> => {
  const { alert, created } = await alertRepo.create(input);
  const result = sanitizeAlert(alert);

  if (!created) {
    logger.debug(
      `Duplicate alert source message "${input.sourceMessageId ?? ''}" ignored; existing alert ${alert.id} reused`,
    );
    return result;
  }

  logger.info(`Alert "${input.title}" created with severity "${input.severity}"`);

  publishEvent('alert:new', {
    id: alert.id,
    vehicle_id: alert.vehicle_id ?? undefined,
    device_id: alert.device_id ?? undefined,
    alert_type: alert.alert_type,
    source: alert.source,
    severity: alert.severity,
    title: alert.title,
    message: alert.message ?? undefined,
    latitude: alert.latitude ?? undefined,
    longitude: alert.longitude ?? undefined,
  });

  publishEvent('notification:new', {
    id: alert.id,
    type: toNotificationType(alert.alert_type),
    title: alert.title,
    message: alert.message ?? undefined,
    isRead: false,
    referenceId: alert.id,
    referenceType: 'alert',
    vehicleId: alert.vehicle_id,
    deviceId: alert.device_id,
    createdAt: alert.created_at.toISOString(),
  });

  publishEvent('activity:new', {
    id: alert.id,
    type: 'alert',
    message: `New ${alert.severity} alert: ${alert.title}`,
    timestamp: alert.created_at.toISOString(),
    vehicle_id: alert.vehicle_id,
    device_id: alert.device_id,
  });

  publishEvent('stats:update', {
    reason: 'alert:new',
    alertId: alert.id,
    device_id: alert.device_id,
    vehicle_id: alert.vehicle_id,
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

  const result = sanitizeAlert(updated);
  publishEvent('alert:updated', {
    id: updated.id,
    vehicle_id: updated.vehicle_id,
    device_id: updated.device_id,
    status: updated.status,
    action: 'acknowledge',
    updated_at: updated.updated_at.toISOString(),
  });
  publishEvent('stats:update', {
    reason: 'alert:updated',
    alertId: updated.id,
    device_id: updated.device_id,
    vehicle_id: updated.vehicle_id,
    timestamp: updated.updated_at.toISOString(),
  });

  return result;
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

  const result = sanitizeAlert(updated);
  publishEvent('alert:updated', {
    id: updated.id,
    vehicle_id: updated.vehicle_id,
    device_id: updated.device_id,
    status: updated.status,
    action: 'resolve',
    updated_at: updated.updated_at.toISOString(),
  });
  publishEvent('stats:update', {
    reason: 'alert:updated',
    alertId: updated.id,
    device_id: updated.device_id,
    vehicle_id: updated.vehicle_id,
    timestamp: updated.updated_at.toISOString(),
  });

  return result;
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
  const result = sanitizeAlert(updated);
  publishEvent('alert:updated', {
    id: updated.id,
    vehicle_id: updated.vehicle_id,
    device_id: updated.device_id,
    status: updated.status,
    action: 'dismiss',
    updated_at: updated.updated_at.toISOString(),
  });
  publishEvent('stats:update', {
    reason: 'alert:updated',
    alertId: updated.id,
    device_id: updated.device_id,
    vehicle_id: updated.vehicle_id,
    timestamp: updated.updated_at.toISOString(),
  });

  return result;
};

export const deleteAlert = async (id: number): Promise<void> => {
  const existing = await alertRepo.findById(id);
  if (!existing) {
    throw createNotFoundError(`Alert with ID ${id} not found`);
  }

  await alertRepo.remove(id);
  logger.info(`Alert ${id} deleted`);
  publishEvent('alert:deleted', {
    id: existing.id,
    vehicle_id: existing.vehicle_id,
    device_id: existing.device_id,
    deleted_at: new Date().toISOString(),
  });
  publishEvent('stats:update', {
    reason: 'alert:deleted',
    alertId: existing.id,
    device_id: existing.device_id,
    vehicle_id: existing.vehicle_id,
    timestamp: new Date().toISOString(),
  });
};
