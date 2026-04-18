import {
  findOne,
  findMany,
  insertOne,
  updateOne,
  deleteOne,
} from '@/infrastructure/database/queries';
import { pool } from '@/infrastructure/database/pool';
import type { Alert, AlertListQuery, CreateAlertInput } from '@/domain/alert/types/alert.types';

const ALERT_LINK_SELECT = `a.*,
  d.device_name,
  link.vehicle_plate,
  link.customer_name`;

const ALERT_LINK_JOINS = `LEFT JOIN devices d ON d.device_id = a.device_id
  LEFT JOIN LATERAL (
    SELECT
      v.plate_number AS vehicle_plate,
      c.name AS customer_name
    FROM vehicles v
    LEFT JOIN customers c ON c.id = v.customer_id
    WHERE
      (a.vehicle_id IS NOT NULL AND v.vehicle_id = a.vehicle_id)
      OR (a.device_id IS NOT NULL AND v.device_id = a.device_id)
      OR (d.vehicle_id IS NOT NULL AND v.vehicle_id = d.vehicle_id)
    ORDER BY
      CASE
        WHEN a.vehicle_id IS NOT NULL AND v.vehicle_id = a.vehicle_id THEN 0
        WHEN a.device_id IS NOT NULL AND v.device_id = a.device_id THEN 1
        ELSE 2
      END,
      v.updated_at DESC,
      v.id DESC
    LIMIT 1
  ) link ON true`;

export const findAll = async (
  query: AlertListQuery,
): Promise<{ alerts: Alert[]; total: number }> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (query.status) {
    conditions.push(`a.status = $${paramIndex++}`);
    params.push(query.status);
  }

  if (query.severity) {
    conditions.push(`a.severity = $${paramIndex++}`);
    params.push(query.severity);
  }

  if (query.alertType) {
    conditions.push(`a.alert_type = $${paramIndex++}`);
    params.push(query.alertType);
  }

  if (query.vehicleId) {
    conditions.push(`a.vehicle_id = $${paramIndex++}`);
    params.push(query.vehicleId);
  }

  if (query.deviceId) {
    conditions.push(`a.device_id = $${paramIndex++}`);
    params.push(query.deviceId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM alerts a ${whereClause}`,
    params,
  );
  const total = parseInt(countResult.rows[0].total, 10);

  const alerts = await findMany<Alert>(
    `SELECT ${ALERT_LINK_SELECT}
     FROM alerts a
     ${ALERT_LINK_JOINS}
     ${whereClause}
     ORDER BY a.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset],
  );

  return { alerts, total };
};

export const findById = async (id: number): Promise<Alert | null> =>
  findOne<Alert>(
    `SELECT ${ALERT_LINK_SELECT}
     FROM alerts a
     ${ALERT_LINK_JOINS}
     WHERE a.id = $1`,
    [id],
  );

export const create = async (input: CreateAlertInput): Promise<Alert> =>
  insertOne<Alert>(
    `INSERT INTO alerts (vehicle_id, device_id, trip_id, geofence_id, alert_type, severity, title, message, latitude, longitude, speed, threshold_value, actual_value, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
     RETURNING *`,
    [
      input.vehicleId ?? null,
      input.deviceId ?? null,
      input.tripId ?? null,
      input.geofenceId ?? null,
      input.alertType,
      input.severity,
      input.title,
      input.message ?? null,
      input.latitude ?? null,
      input.longitude ?? null,
      input.speed ?? null,
      input.thresholdValue ?? null,
      input.actualValue ?? null,
    ],
  );

export const acknowledge = async (id: number, userId: number): Promise<Alert | null> =>
  updateOne<Alert>(
    `UPDATE alerts SET status = 'acknowledged', acknowledged_by = $1, acknowledged_at = NOW(), updated_at = NOW() WHERE id = $2 RETURNING *`,
    [userId, id],
  );

export const resolve = async (
  id: number,
  userId: number,
  resolutionNotes: string | null,
): Promise<Alert | null> =>
  updateOne<Alert>(
    `UPDATE alerts SET status = 'resolved', resolved_by = $1, resolved_at = NOW(), resolution_notes = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
    [userId, resolutionNotes, id],
  );

export const dismiss = async (id: number): Promise<Alert | null> =>
  updateOne<Alert>(
    `UPDATE alerts SET status = 'dismissed', updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id],
  );

export const remove = async (id: number): Promise<boolean> =>
  deleteOne('DELETE FROM alerts WHERE id = $1', [id]);
