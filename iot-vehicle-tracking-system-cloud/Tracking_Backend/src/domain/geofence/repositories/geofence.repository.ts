import {
  findOne,
  findMany,
  insertOne,
  updateOne,
  deleteOne,
  executeQuery,
} from '@/infrastructure/database/queries';
import { pool } from '@/infrastructure/database/pool';
import { geofenceGlobalScope, type GeofenceAccessScope } from './vehicle-policy.repository';
import type {
  Geofence,
  GeofenceListQuery,
  CreateGeofenceInput,
  UpdateGeofenceInput,
} from '@/domain/geofence/types/geofence.types';

export const findAll = async (
  query: GeofenceListQuery,
): Promise<{ geofences: Geofence[]; total: number }> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (query.isActive !== undefined) {
    conditions.push(`is_active = $${paramIndex++}`);
    params.push(query.isActive);
  }

  if (query.geofenceType) {
    conditions.push(`geofence_type = $${paramIndex++}`);
    params.push(query.geofenceType);
  }

  if (query.search) {
    conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
    params.push(`%${query.search}%`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM geofences ${whereClause}`,
    params,
  );
  const total = parseInt(countResult.rows[0].total, 10);

  const geofences = await findMany<Geofence>(
    `SELECT * FROM geofences ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset],
  );

  return { geofences, total };
};

export const findById = async (id: number): Promise<Geofence | null> =>
  findOne<Geofence>('SELECT * FROM geofences WHERE id = $1', [id]);

export const create = async (input: CreateGeofenceInput, createdBy?: number): Promise<Geofence> =>
  insertOne<Geofence>(
    `INSERT INTO geofences (name, description, geofence_type, center_latitude, center_longitude, radius_meters, coordinates, trigger_on, notify_email, notify_push, color, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
     RETURNING *`,
    [
      input.name,
      input.description ?? null,
      input.geofenceType ?? 'circle',
      input.centerLatitude ?? null,
      input.centerLongitude ?? null,
      input.radiusMeters ?? null,
      input.coordinates ? JSON.stringify(input.coordinates) : null,
      input.triggerOn ?? 'both',
      input.notifyEmail ?? false,
      input.notifyPush ?? false,
      input.color ?? '#EF4444',
      createdBy ?? null,
    ],
  );

export const update = async (id: number, input: UpdateGeofenceInput): Promise<Geofence | null> => {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.name !== undefined) {
    setClauses.push(`name = $${paramIndex++}`);
    values.push(input.name);
  }
  if (input.description !== undefined) {
    setClauses.push(`description = $${paramIndex++}`);
    values.push(input.description);
  }
  if (input.geofenceType !== undefined) {
    setClauses.push(`geofence_type = $${paramIndex++}`);
    values.push(input.geofenceType);
  }
  if (input.centerLatitude !== undefined) {
    setClauses.push(`center_latitude = $${paramIndex++}`);
    values.push(input.centerLatitude);
  }
  if (input.centerLongitude !== undefined) {
    setClauses.push(`center_longitude = $${paramIndex++}`);
    values.push(input.centerLongitude);
  }
  if (input.radiusMeters !== undefined) {
    setClauses.push(`radius_meters = $${paramIndex++}`);
    values.push(input.radiusMeters);
  }
  if (input.coordinates !== undefined) {
    setClauses.push(`coordinates = $${paramIndex++}`);
    values.push(input.coordinates ? JSON.stringify(input.coordinates) : null);
  }
  if (input.triggerOn !== undefined) {
    setClauses.push(`trigger_on = $${paramIndex++}`);
    values.push(input.triggerOn);
  }
  if (input.isActive !== undefined) {
    setClauses.push(`is_active = $${paramIndex++}`);
    values.push(input.isActive);
  }
  if (input.notifyEmail !== undefined) {
    setClauses.push(`notify_email = $${paramIndex++}`);
    values.push(input.notifyEmail);
  }
  if (input.notifyPush !== undefined) {
    setClauses.push(`notify_push = $${paramIndex++}`);
    values.push(input.notifyPush);
  }
  if (input.color !== undefined) {
    setClauses.push(`color = $${paramIndex++}`);
    values.push(input.color);
  }
  if (input.displayHidden !== undefined) {
    setClauses.push(`display_hidden = $${paramIndex++}`);
    values.push(input.displayHidden);
  }

  if (setClauses.length === 0) return findById(id);

  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  return updateOne<Geofence>(
    `UPDATE geofences SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values,
  );
};

export const remove = async (id: number): Promise<boolean> =>
  deleteOne('DELETE FROM geofences WHERE id = $1', [id]);

export const assignVehicle = async (
  geofenceId: number, vehicleId: string, scope: GeofenceAccessScope,
): Promise<number> =>
  executeQuery(
    `INSERT INTO geofence_vehicles (geofence_id, vehicle_id, created_at)
     SELECT g.id, v.vehicle_id, NOW()
     FROM geofences g JOIN vehicles v ON v.vehicle_id = $2
     WHERE g.id = $1 AND ($3::boolean OR EXISTS (
       SELECT 1 FROM user_device_access uda
       WHERE uda.user_id = $4 AND uda.device_id = v.device_id
     )) ON CONFLICT DO NOTHING`,
    [geofenceId, vehicleId, geofenceGlobalScope(scope), scope.userId],
  );

export const unassignVehicle = async (
  geofenceId: number, vehicleId: string, scope: GeofenceAccessScope,
): Promise<boolean> =>
  deleteOne(
    `DELETE FROM geofence_vehicles gv
     WHERE gv.geofence_id = $1 AND gv.vehicle_id = $2
       AND ($3::boolean OR EXISTS (
         SELECT 1 FROM vehicles v JOIN user_device_access uda ON uda.device_id = v.device_id
         WHERE v.vehicle_id = gv.vehicle_id AND uda.user_id = $4
       ))`,
    [geofenceId, vehicleId, geofenceGlobalScope(scope), scope.userId],
  );
export const findVehiclesByGeofenceId = async (
  geofenceId: number,
): Promise<{ vehicle_id: string }[]> =>
  findMany<{ vehicle_id: string }>(
    'SELECT vehicle_id FROM geofence_vehicles WHERE geofence_id = $1',
    [geofenceId],
  );
