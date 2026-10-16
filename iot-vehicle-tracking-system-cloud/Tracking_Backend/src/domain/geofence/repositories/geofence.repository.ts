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

export const geofenceVisibleTo = (scope: GeofenceAccessScope, bind: string): string =>
  geofenceGlobalScope(scope) ? 'TRUE' : `(
    g.created_by = ${bind} OR EXISTS (
      SELECT 1 FROM geofence_vehicles gv
      JOIN vehicles v ON v.vehicle_id = gv.vehicle_id
      JOIN user_device_access uda ON uda.device_id = v.device_id
      WHERE gv.geofence_id = g.id AND uda.user_id = ${bind}
    )
  )`;

export const findAll = async (
  query: GeofenceListQuery, scope: GeofenceAccessScope,
): Promise<{ geofences: Geofence[]; total: number }> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const offset = (page - 1) * limit;
  const params: unknown[] = [];
  let paramIndex = 1;
  const scopeBind = '$' + paramIndex;
  const conditions: string[] = [geofenceVisibleTo(scope, scopeBind)];
  if (!geofenceGlobalScope(scope)) {
    params.push(scope.userId);
    paramIndex++;
  }

  if (query.isActive !== undefined) {
    conditions.push(`g.is_active = $${paramIndex++}`);
    params.push(query.isActive);
  }
  if (query.geofenceType) {
    conditions.push(`g.geofence_type = $${paramIndex++}`);
    params.push(query.geofenceType);
  }
  if (query.search) {
    conditions.push(`(g.name ILIKE $${paramIndex} OR g.description ILIKE $${paramIndex})`);
    params.push(`%${query.search}%`);
    paramIndex++;
  }
  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const count = await pool.query(
    `SELECT COUNT(*) AS total FROM geofences g ${whereClause}`, params,
  );
  const total = Number.parseInt(count.rows[0].total, 10);
  const geofences = await findMany<Geofence>(
    `SELECT g.* FROM geofences g ${whereClause}
     ORDER BY g.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset],
  );
  return { geofences, total };
};

export const findByIdForScope = async (
  id: number, scope: GeofenceAccessScope,
): Promise<Geofence | null> =>
  findOne<Geofence>(
    `SELECT g.* FROM geofences g
     WHERE g.id = $1 AND ${geofenceVisibleTo(scope, '$2')}`,
    geofenceGlobalScope(scope) ? [id] : [id, scope.userId],
  );

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

// A manager may edit only a geofence they created and only while they have
// current rights to every vehicle affected by it. Shared cross-fleet zones
// therefore require a full-fleet actor (or an administrator) to change.
const geofenceMutationGuard = (globalBind: string, userBind: string): string => `(
  ${globalBind}::boolean OR (
    g.created_by = ${userBind} AND NOT EXISTS (
      SELECT 1 FROM geofence_vehicles gv
      WHERE gv.geofence_id = g.id AND NOT EXISTS (
        SELECT 1 FROM vehicles v JOIN user_device_access uda ON uda.device_id = v.device_id
        WHERE v.vehicle_id = gv.vehicle_id AND uda.user_id = ${userBind}
      )
    )
  )
)`;

export const findByIdForWriteScope = async (
  id: number, scope: GeofenceAccessScope,
): Promise<Geofence | null> => findOne<Geofence>(
  `SELECT g.* FROM geofences g WHERE g.id = $1 AND ${geofenceMutationGuard('$2', '$3')}`,
  [id, geofenceGlobalScope(scope), scope.userId],
);
export const update = async (id: number, input: UpdateGeofenceInput, scope: GeofenceAccessScope): Promise<Geofence | null> => {
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

  if (setClauses.length === 0) return findByIdForWriteScope(id, scope);

  setClauses.push('updated_at = NOW()');
  values.push(id);
  const targetBind = '$' + paramIndex++;
  const globalBind = '$' + paramIndex++;
  const userBind = '$' + paramIndex;
  values.push(geofenceGlobalScope(scope), scope.userId);
  const grant = geofenceMutationGuard(globalBind, userBind);
  return updateOne<Geofence>(
    `UPDATE geofences AS g SET ${setClauses.join(', ')}
     WHERE g.id = ${targetBind} AND ${grant} RETURNING g.*`,
    values,
  );
};

export const remove = async (id: number): Promise<boolean> =>
  deleteOne('DELETE FROM geofences WHERE id = $1', [id]);

export const assignVehicle = async (
  geofenceId: number, vehicleId: string, scope: GeofenceAccessScope,
): Promise<number> =>
  executeQuery(
    `INSERT INTO geofence_vehicles (geofence_id, vehicle_id, assigned_at)
     SELECT g.id, v.vehicle_id, NOW()
     FROM geofences g JOIN vehicles v ON v.vehicle_id = $2
     WHERE g.id = $1 AND ($3::boolean OR EXISTS (
       SELECT 1 FROM user_device_access uda
       WHERE uda.user_id = $4 AND uda.device_id = v.device_id
     )) ON CONFLICT (geofence_id, vehicle_id)
     DO UPDATE SET assigned_at = geofence_vehicles.assigned_at`,
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

export const findVehiclesByGeofenceIdForScope = async (
  geofenceId: number, scope: GeofenceAccessScope,
): Promise<{ vehicle_id: string }[]> =>
  findMany<{ vehicle_id: string }>(
    `SELECT gv.vehicle_id FROM geofence_vehicles gv
     WHERE gv.geofence_id = $1 AND ($2::boolean OR EXISTS (
       SELECT 1 FROM vehicles v JOIN user_device_access uda ON uda.device_id = v.device_id
       WHERE v.vehicle_id = gv.vehicle_id AND uda.user_id = $3
     ))`,
    [geofenceId, geofenceGlobalScope(scope), scope.userId],
  );
