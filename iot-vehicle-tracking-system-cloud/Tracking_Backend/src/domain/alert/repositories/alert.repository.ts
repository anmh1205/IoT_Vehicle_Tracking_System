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
  t.trip_code,
  g.name AS geofence_name,
  link.vehicle_plate,
  link.customer_name`;

const ALERT_LINK_JOINS = `LEFT JOIN devices d ON d.device_id = a.device_id
  LEFT JOIN trips t ON t.id = a.trip_id
  LEFT JOIN geofences g ON g.id = a.geofence_id
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

const OBD_MAINTENANCE_ALERT_CONDITION = `(a.alert_type = 'maintenance_due' AND (
  a.source::text = 'ecu'
  OR CONCAT_WS(' ', COALESCE(a.title, ''), COALESCE(a.message, '')) ~* '(^|[^a-z0-9])(obd|dtc|mil|ecu|[pcbu][0-3][0-9a-f]{3})([^a-z0-9]|$)'
  OR COALESCE(a.title, '') ILIKE '%coolant%'
  OR COALESCE(a.message, '') ILIKE '%coolant%'
  OR COALESCE(a.title, '') ILIKE '%voltage%'
  OR COALESCE(a.message, '') ILIKE '%voltage%'
  OR COALESCE(a.title, '') ILIKE '%idle-load%'
  OR COALESCE(a.message, '') ILIKE '%idle-load%'
  OR COALESCE(a.title, '') ILIKE '%channel%'
  OR COALESCE(a.message, '') ILIKE '%channel%'
))`;

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

  if (query.source) {
    if (query.source === 'obd') {
      conditions.push(OBD_MAINTENANCE_ALERT_CONDITION);
    } else if (query.source === 'system') {
      conditions.push(`NOT ${OBD_MAINTENANCE_ALERT_CONDITION}`);
    } else {
      conditions.push(`a.source::text = $${paramIndex++}`);
      params.push(query.source);
    }
  }

  if (query.search) {
    conditions.push(`(
      a.title ILIKE $${paramIndex}
      OR COALESCE(a.message, '') ILIKE $${paramIndex}
      OR a.alert_type::text ILIKE $${paramIndex}
      OR COALESCE(a.vehicle_id, '') ILIKE $${paramIndex}
      OR COALESCE(a.device_id, '') ILIKE $${paramIndex}
    )`);
    params.push(`%${query.search}%`);
    paramIndex++;
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

export const create = async (
  input: CreateAlertInput,
): Promise<{ alert: Alert; created: boolean }> => {
  const client = await pool.connect();
  const sourceMessageId = input.sourceMessageId?.trim() || null;

  try {
    await client.query('BEGIN');
    const inserted = await client.query<Alert>(
      `INSERT INTO alerts (
         vehicle_id, device_id, trip_id, geofence_id, alert_type, source, severity,
         title, message, latitude, longitude, speed, threshold_value, actual_value,
         source_message_id, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
       ON CONFLICT (device_id, source_message_id, alert_type, title) WHERE source_message_id IS NOT NULL DO NOTHING
       RETURNING *`,
      [
        input.vehicleId ?? null,
        input.deviceId ?? null,
        input.tripId ?? null,
        input.geofenceId ?? null,
        input.alertType,
        input.source ?? 'device',
        input.severity,
        input.title,
        input.message ?? null,
        input.latitude ?? null,
        input.longitude ?? null,
        input.speed ?? null,
        input.thresholdValue ?? null,
        input.actualValue ?? null,
        sourceMessageId,
      ],
    );

    if (inserted.rows[0]) {
      await client.query('COMMIT');
      return { alert: inserted.rows[0], created: true };
    }

    if (sourceMessageId === null) {
      throw new Error('Alert insert returned no row without a source message identity');
    }

    const existing = await client.query<Alert>(
      `SELECT *
       FROM alerts
       WHERE device_id IS NOT DISTINCT FROM $1
         AND source_message_id = $2
         AND alert_type = $3
         AND title = $4
       LIMIT 1`,
      [input.deviceId ?? null, sourceMessageId, input.alertType, input.title],
    );
    if (!existing.rows[0]) {
      throw new Error(`Alert source message ${sourceMessageId} conflicted but existing row was not found`);
    }

    await client.query('COMMIT');
    return { alert: existing.rows[0], created: false };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

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
