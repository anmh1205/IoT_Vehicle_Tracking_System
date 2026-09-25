import {
  findOne,
  findMany,
  insertOne,
  updateOne,
  deleteOne,
} from '@/infrastructure/database/queries';
import { pool } from '@/infrastructure/database/pool';
import type {
  Trip,
  TripListQuery,
  CreateTripInput,
  UpdateTripInput,
} from '@/domain/trip/types/trip.types';

const ALLOWED_SORT_COLUMNS: Record<string, string> = {
  tripCode: 't.trip_code',
  status: 't.status',
  plannedStart: 't.planned_start',
  actualStart: 't.actual_start',
  createdAt: 't.created_at',
};

const TRIP_FROM_CLAUSE = `
  FROM trips t
  LEFT JOIN vehicles v ON v.vehicle_id = t.vehicle_id
  LEFT JOIN customers c ON c.id = v.customer_id
`;

const TRIP_SELECT_CLAUSE = `
  SELECT
    t.*,
    v.plate_number AS vehicle_plate,
    c.name AS customer_name
  ${TRIP_FROM_CLAUSE}
`;

export const findAll = async (query: TripListQuery): Promise<{ trips: Trip[]; total: number }> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (query.status) {
    conditions.push(`t.status = $${paramIndex++}`);
    params.push(query.status);
  }

  if (query.vehicleId) {
    conditions.push(`t.vehicle_id = $${paramIndex++}`);
    params.push(query.vehicleId);
  }

  if (query.search) {
    conditions.push(
      `(t.trip_code ILIKE $${paramIndex} OR t.vehicle_id ILIKE $${paramIndex} OR v.plate_number ILIKE $${paramIndex} OR c.name ILIKE $${paramIndex} OR t.device_id ILIKE $${paramIndex} OR t.driver_name ILIKE $${paramIndex} OR t.start_location ILIKE $${paramIndex} OR t.end_location ILIKE $${paramIndex} OR t.notes ILIKE $${paramIndex})`,
    );
    params.push(`%${query.search}%`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sortColumn = ALLOWED_SORT_COLUMNS[query.sortBy ?? ''] ?? 't.created_at';
  const sortOrder = query.sortOrder === 'asc' ? 'ASC' : 'DESC';
  const orderClause = `ORDER BY ${sortColumn} ${sortOrder}`;

  const countResult = await pool.query(
    `SELECT COUNT(t.id) as total ${TRIP_FROM_CLAUSE} ${whereClause}`,
    params,
  );
  const total = parseInt(countResult.rows[0].total, 10);

  const trips = await findMany<Trip>(
    `${TRIP_SELECT_CLAUSE} ${whereClause} ${orderClause} LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset],
  );

  return { trips, total };
};

export const findById = async (id: number): Promise<Trip | null> =>
  findOne<Trip>(`${TRIP_SELECT_CLAUSE} WHERE t.id = $1`, [id]);

export const findByTripCode = async (tripCode: string): Promise<Trip | null> =>
  findOne<Trip>('SELECT * FROM trips WHERE trip_code = $1', [tripCode]);

export const create = async (input: CreateTripInput): Promise<Trip> =>
  insertOne<Trip>(
    `INSERT INTO trips (trip_code, vehicle_id, device_id, driver_name, driver_phone, start_location, end_location, planned_start, planned_end, notes, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
     RETURNING *`,
    [
      input.tripCode,
      input.vehicleId ?? null,
      input.deviceId ?? null,
      input.driverName ?? null,
      input.driverPhone ?? null,
      input.startLocation ?? null,
      input.endLocation ?? null,
      input.plannedStart ?? null,
      input.plannedEnd ?? null,
      input.notes ?? null,
    ],
  );

export const update = async (id: number, input: UpdateTripInput): Promise<Trip | null> => {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.vehicleId !== undefined) {
    setClauses.push(`vehicle_id = $${paramIndex++}`);
    values.push(input.vehicleId);
  }
  if (input.deviceId !== undefined) {
    setClauses.push(`device_id = $${paramIndex++}`);
    values.push(input.deviceId);
  }
  if (input.driverName !== undefined) {
    setClauses.push(`driver_name = $${paramIndex++}`);
    values.push(input.driverName);
  }
  if (input.driverPhone !== undefined) {
    setClauses.push(`driver_phone = $${paramIndex++}`);
    values.push(input.driverPhone);
  }
  if (input.startLocation !== undefined) {
    setClauses.push(`start_location = $${paramIndex++}`);
    values.push(input.startLocation);
  }
  if (input.endLocation !== undefined) {
    setClauses.push(`end_location = $${paramIndex++}`);
    values.push(input.endLocation);
  }
  if (input.plannedStart !== undefined) {
    setClauses.push(`planned_start = $${paramIndex++}`);
    values.push(input.plannedStart);
  }
  if (input.plannedEnd !== undefined) {
    setClauses.push(`planned_end = $${paramIndex++}`);
    values.push(input.plannedEnd);
  }
  if (input.notes !== undefined) {
    setClauses.push(`notes = $${paramIndex++}`);
    values.push(input.notes);
  }

  if (setClauses.length === 0) return findById(id);

  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  return updateOne<Trip>(
    `UPDATE trips SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values,
  );
};

export const startTrip = async (id: number): Promise<Trip | null> =>
  updateOne<Trip>(
    `UPDATE trips SET actual_start = NOW(), status = 'in_progress', updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id],
  );

export const endTrip = async (id: number): Promise<Trip | null> =>
  updateOne<Trip>(
    `UPDATE trips SET actual_end = NOW(), status = 'completed', updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id],
  );

/** End trip with computed route stats from VictoriaMetrics waypoints */
export const endTripWithStats = async (
  id: number,
  stats: {
    distanceKm: number;
    startLatitude: number | null;
    startLongitude: number | null;
    endLatitude: number | null;
    endLongitude: number | null;
  },
): Promise<Trip | null> =>
  updateOne<Trip>(
    `UPDATE trips SET
       actual_end = NOW(),
       status = 'completed',
       distance_km = $2,
       start_latitude = COALESCE($3, start_latitude),
       start_longitude = COALESCE($4, start_longitude),
       end_latitude = COALESCE($5, end_latitude),
       end_longitude = COALESCE($6, end_longitude),
       updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, stats.distanceKm, stats.startLatitude, stats.startLongitude, stats.endLatitude, stats.endLongitude],
  );

export const remove = async (id: number): Promise<boolean> =>
  deleteOne('DELETE FROM trips WHERE id = $1', [id]);
