import {
  findOne,
  findMany,
  insertOne,
  updateOne,
  deleteOne,
} from '@/infrastructure/database/queries';
import { pool } from '@/infrastructure/database/pool';
import type {
  Driver,
  DriverAssignment,
  DriverRecentTrip,
  DriverListQuery,
  CreateDriverInput,
  UpdateDriverInput,
} from '@/domain/driver/types/driver.types';

const ALLOWED_SORT_COLUMNS: Record<string, string> = {
  driverCode: 'driver_code',
  fullName: 'full_name',
  phone: 'phone',
  status: 'status',
  createdAt: 'created_at',
};

type DriverAssignmentRow = {
  driver_key: string;
  trip_count: number;
  active_trip_count: number;
  latest_trip_id: number | null;
  latest_trip_code: string | null;
  latest_trip_status: DriverAssignment['latestTripStatus'];
  latest_trip_at: Date | null;
  latest_vehicle_id: string | null;
  latest_device_id: string | null;
  latest_start_location: string | null;
  latest_end_location: string | null;
  active_trip_code: string | null;
  active_vehicle_id: string | null;
  active_device_id: string | null;
};

type DriverRecentTripRow = {
  id: number;
  trip_code: string;
  vehicle_id: string | null;
  device_id: string | null;
  status: DriverRecentTrip['status'];
  planned_start: Date | null;
  actual_start: Date | null;
  actual_end: Date | null;
  start_location: string | null;
  end_location: string | null;
  distance_km: number | null;
  updated_at: Date;
};

const NORMALIZED_DRIVER_NAME_SQL = (tableAlias = 't') =>
  `LOWER(REGEXP_REPLACE(TRIM(COALESCE(${tableAlias}.driver_name, '')), '\\s+', ' ', 'g'))`;

const mapAssignmentRow = (row: DriverAssignmentRow): DriverAssignment => ({
  tripCount: Number(row.trip_count ?? 0),
  activeTripCount: Number(row.active_trip_count ?? 0),
  latestTripId: row.latest_trip_id ?? null,
  latestTripCode: row.latest_trip_code ?? null,
  latestTripStatus: row.latest_trip_status ?? null,
  latestTripAt: row.latest_trip_at?.toISOString() ?? null,
  latestVehicleId: row.latest_vehicle_id ?? null,
  latestDeviceId: row.latest_device_id ?? null,
  latestStartLocation: row.latest_start_location ?? null,
  latestEndLocation: row.latest_end_location ?? null,
  activeTripCode: row.active_trip_code ?? null,
  activeVehicleId: row.active_vehicle_id ?? null,
  activeDeviceId: row.active_device_id ?? null,
});

const mapRecentTripRow = (row: DriverRecentTripRow): DriverRecentTrip => ({
  id: row.id,
  tripCode: row.trip_code,
  vehicleId: row.vehicle_id,
  deviceId: row.device_id,
  status: row.status,
  plannedStart: row.planned_start?.toISOString() ?? null,
  actualStart: row.actual_start?.toISOString() ?? null,
  actualEnd: row.actual_end?.toISOString() ?? null,
  startLocation: row.start_location,
  endLocation: row.end_location,
  distanceKm: row.distance_km,
  updatedAt: row.updated_at.toISOString(),
});

export const findAll = async (
  query: DriverListQuery,
): Promise<{ drivers: Driver[]; total: number }> => {
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

  if (query.search) {
    conditions.push(
      `(driver_code ILIKE $${paramIndex} OR full_name ILIKE $${paramIndex} OR phone ILIKE $${paramIndex} OR license_number ILIKE $${paramIndex})`,
    );
    params.push(`%${query.search}%`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sortColumn = ALLOWED_SORT_COLUMNS[query.sortBy ?? ''] ?? 'created_at';
  const sortOrder = query.sortOrder === 'asc' ? 'ASC' : 'DESC';
  const orderClause = `ORDER BY ${sortColumn} ${sortOrder}`;

  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM drivers ${whereClause}`,
    params,
  );
  const total = parseInt(countResult.rows[0].total, 10);

  const drivers = await findMany<Driver>(
    `SELECT * FROM drivers ${whereClause} ${orderClause} LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset],
  );

  return { drivers, total };
};

export const findById = async (id: number): Promise<Driver | null> =>
  findOne<Driver>('SELECT * FROM drivers WHERE id = $1', [id]);

export const findByCode = async (driverCode: string): Promise<Driver | null> =>
  findOne<Driver>('SELECT * FROM drivers WHERE driver_code = $1', [driverCode]);

export const findAssignmentSummariesByNames = async (
  driverKeys: string[],
): Promise<Map<string, DriverAssignment>> => {
  const normalizedKeys = Array.from(new Set(driverKeys.filter(Boolean)));
  if (normalizedKeys.length === 0) {
    return new Map();
  }

  const result = await pool.query<DriverAssignmentRow>(
    `WITH input_keys AS (
       SELECT DISTINCT driver_key
       FROM UNNEST($1::text[]) AS input(driver_key)
       WHERE driver_key <> ''
     )
     SELECT
       input_keys.driver_key,
       COALESCE(stats.trip_count, 0) AS trip_count,
       COALESCE(stats.active_trip_count, 0) AS active_trip_count,
       latest.id AS latest_trip_id,
       latest.trip_code AS latest_trip_code,
       latest.status AS latest_trip_status,
       latest.latest_trip_at,
       latest.vehicle_id AS latest_vehicle_id,
       latest.device_id AS latest_device_id,
       latest.start_location AS latest_start_location,
       latest.end_location AS latest_end_location,
       active.trip_code AS active_trip_code,
       active.vehicle_id AS active_vehicle_id,
       active.device_id AS active_device_id
     FROM input_keys
     LEFT JOIN LATERAL (
       SELECT
         COUNT(*)::int AS trip_count,
         COUNT(*) FILTER (WHERE t.status = 'in_progress')::int AS active_trip_count
       FROM trips t
       WHERE ${NORMALIZED_DRIVER_NAME_SQL('t')} = input_keys.driver_key
     ) stats ON true
     LEFT JOIN LATERAL (
       SELECT
         t.id,
         t.trip_code,
         t.status,
         COALESCE(t.actual_start, t.planned_start, t.created_at) AS latest_trip_at,
         t.vehicle_id,
         t.device_id,
         t.start_location,
         t.end_location
       FROM trips t
       WHERE ${NORMALIZED_DRIVER_NAME_SQL('t')} = input_keys.driver_key
       ORDER BY COALESCE(t.actual_start, t.planned_start, t.created_at) DESC, t.id DESC
       LIMIT 1
     ) latest ON true
     LEFT JOIN LATERAL (
       SELECT
         t.trip_code,
         t.vehicle_id,
         t.device_id
       FROM trips t
       WHERE ${NORMALIZED_DRIVER_NAME_SQL('t')} = input_keys.driver_key
         AND t.status = 'in_progress'
       ORDER BY COALESCE(t.actual_start, t.planned_start, t.created_at) DESC, t.id DESC
       LIMIT 1
     ) active ON true`,
    [normalizedKeys],
  );

  return new Map(
    result.rows.map((row) => [row.driver_key, mapAssignmentRow(row)]),
  );
};

export const findAssignmentSummaryByName = async (
  driverKey: string,
): Promise<DriverAssignment | null> => {
  const summaries = await findAssignmentSummariesByNames([driverKey]);
  return summaries.get(driverKey) ?? null;
};

export const findRecentTripsByDriverName = async (
  driverKey: string,
  limit = 6,
): Promise<DriverRecentTrip[]> => {
  if (!driverKey) {
    return [];
  }

  const result = await pool.query<DriverRecentTripRow>(
    `SELECT
        t.id,
        t.trip_code,
        t.vehicle_id,
        t.device_id,
        t.status,
        t.planned_start,
        t.actual_start,
        t.actual_end,
        t.start_location,
        t.end_location,
        t.distance_km,
        t.updated_at
     FROM trips t
     WHERE ${NORMALIZED_DRIVER_NAME_SQL('t')} = $1
     ORDER BY COALESCE(t.actual_start, t.planned_start, t.created_at) DESC, t.id DESC
     LIMIT $2`,
    [driverKey, limit],
  );

  return result.rows.map(mapRecentTripRow);
};

export const create = async (input: CreateDriverInput): Promise<Driver> =>
  insertOne<Driver>(
    `INSERT INTO drivers (driver_code, full_name, phone, email, license_number, license_type, license_expiry, date_of_birth, address, avatar_url, status, notes, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
     RETURNING *`,
    [
      input.driverCode,
      input.fullName,
      input.phone ?? null,
      input.email ?? null,
      input.licenseNumber ?? null,
      input.licenseType ?? null,
      input.licenseExpiry ?? null,
      input.dateOfBirth ?? null,
      input.address ?? null,
      input.avatarUrl ?? null,
      input.status ?? 'active',
      input.notes ?? null,
    ],
  );

export const update = async (id: number, input: UpdateDriverInput): Promise<Driver | null> => {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.driverCode !== undefined) {
    setClauses.push(`driver_code = $${paramIndex++}`);
    values.push(input.driverCode);
  }
  if (input.fullName !== undefined) {
    setClauses.push(`full_name = $${paramIndex++}`);
    values.push(input.fullName);
  }
  if (input.phone !== undefined) {
    setClauses.push(`phone = $${paramIndex++}`);
    values.push(input.phone);
  }
  if (input.email !== undefined) {
    setClauses.push(`email = $${paramIndex++}`);
    values.push(input.email);
  }
  if (input.licenseNumber !== undefined) {
    setClauses.push(`license_number = $${paramIndex++}`);
    values.push(input.licenseNumber);
  }
  if (input.licenseType !== undefined) {
    setClauses.push(`license_type = $${paramIndex++}`);
    values.push(input.licenseType);
  }
  if (input.licenseExpiry !== undefined) {
    setClauses.push(`license_expiry = $${paramIndex++}`);
    values.push(input.licenseExpiry);
  }
  if (input.dateOfBirth !== undefined) {
    setClauses.push(`date_of_birth = $${paramIndex++}`);
    values.push(input.dateOfBirth);
  }
  if (input.address !== undefined) {
    setClauses.push(`address = $${paramIndex++}`);
    values.push(input.address);
  }
  if (input.avatarUrl !== undefined) {
    setClauses.push(`avatar_url = $${paramIndex++}`);
    values.push(input.avatarUrl);
  }
  if (input.status !== undefined) {
    setClauses.push(`status = $${paramIndex++}`);
    values.push(input.status);
  }
  if (input.notes !== undefined) {
    setClauses.push(`notes = $${paramIndex++}`);
    values.push(input.notes);
  }

  if (setClauses.length === 0) return findById(id);

  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  return updateOne<Driver>(
    `UPDATE drivers SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values,
  );
};

export const remove = async (id: number): Promise<boolean> =>
  deleteOne('DELETE FROM drivers WHERE id = $1', [id]);
