import {
  findOne,
  findMany,
  insertOne,
  updateOne,
  deleteOne,
} from '@/infrastructure/database/queries';
import { pool } from '@/infrastructure/database/pool';
import type { Alert, AlertListQuery, CreateAlertInput } from '@/domain/alert/types/alert.types';

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
    conditions.push(`status = $${paramIndex++}`);
    params.push(query.status);
  }

  if (query.severity) {
    conditions.push(`severity = $${paramIndex++}`);
    params.push(query.severity);
  }

  if (query.alertType) {
    conditions.push(`alert_type = $${paramIndex++}`);
    params.push(query.alertType);
  }

  if (query.vehicleId) {
    conditions.push(`vehicle_id = $${paramIndex++}`);
    params.push(query.vehicleId);
  }

  if (query.deviceId) {
    conditions.push(`device_id = $${paramIndex++}`);
    params.push(query.deviceId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM alerts ${whereClause}`,
    params,
  );
  const total = parseInt(countResult.rows[0].total, 10);

  const alerts = await findMany<Alert>(
    `SELECT * FROM alerts ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset],
  );

  return { alerts, total };
};

export const findById = async (id: number): Promise<Alert | null> =>
  findOne<Alert>('SELECT * FROM alerts WHERE id = $1', [id]);

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
