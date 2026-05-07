import * as alertRepo from '@/domain/alert/repositories/alert.repository';
import type { Alert, AlertListQuery, AlertPublic } from '@/domain/alert/types/alert.types';

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

export const listAlerts = async (
  query: AlertListQuery,
): Promise<{
  items: AlertPublic[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  const result = await alertRepo.findAll(query);

  return {
    items: result.alerts.map(sanitizeAlert),
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
    },
  };
};
