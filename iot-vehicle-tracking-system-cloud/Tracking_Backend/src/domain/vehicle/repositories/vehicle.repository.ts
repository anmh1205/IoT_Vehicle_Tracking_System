import {
  findOne,
  findMany,
  insertOne,
  updateOne,
  deleteOne,
} from '@/infrastructure/database/queries';
import { pool } from '@/infrastructure/database/pool';
import type {
  Vehicle,
  VehicleListQuery,
  CreateVehicleInput,
  UpdateVehicleInput,
} from '@/domain/vehicle/types/vehicle.types';

const ALLOWED_SORT_COLUMNS: Record<string, string> = {
  vehicleId: 'vehicle_id',
  plateNumber: 'plate_number',
  brand: 'brand',
  status: 'status',
  createdAt: 'created_at',
};

export const findAll = async (
  query: VehicleListQuery,
): Promise<{ vehicles: Vehicle[]; total: number }> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (query.status) {
    conditions.push(`v.status = $${paramIndex++}`);
    params.push(query.status);
  }

  if (query.customerId) {
    conditions.push(`v.customer_id = $${paramIndex++}`);
    params.push(query.customerId);
  }

  if (query.customerState === 'assigned') {
    conditions.push('v.customer_id IS NOT NULL');
  }

  if (query.customerState === 'unassigned') {
    conditions.push('v.customer_id IS NULL');
  }

  if (query.search) {
    conditions.push(
      `(v.vehicle_id ILIKE $${paramIndex} OR v.plate_number ILIKE $${paramIndex} OR v.brand ILIKE $${paramIndex})`,
    );
    params.push(`%${query.search}%`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sortColumn = ALLOWED_SORT_COLUMNS[query.sortBy ?? ''] ?? 'created_at';
  const sortOrder = query.sortOrder === 'asc' ? 'ASC' : 'DESC';
  const orderClause = `ORDER BY v.${sortColumn} ${sortOrder}`;

  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM vehicles v ${whereClause}`,
    params,
  );
  const total = parseInt(countResult.rows[0].total, 10);

  const vehicles = await findMany<Vehicle>(
    `SELECT
        v.*,
        c.customer_code,
        c.name AS customer_name
     FROM vehicles v
     LEFT JOIN customers c ON c.id = v.customer_id
     ${whereClause}
     ${orderClause}
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset],
  );

  return { vehicles, total };
};

export const findById = async (id: number): Promise<Vehicle | null> =>
  findOne<Vehicle>(
    `SELECT
        v.*,
        c.customer_code,
        c.name AS customer_name
     FROM vehicles v
     LEFT JOIN customers c ON c.id = v.customer_id
     WHERE v.id = $1`,
    [id],
  );

export const findByVehicleId = async (vehicleId: string): Promise<Vehicle | null> =>
  findOne<Vehicle>('SELECT * FROM vehicles WHERE vehicle_id = $1', [vehicleId]);

export const create = async (input: CreateVehicleInput): Promise<Vehicle> =>
  insertOne<Vehicle>(
    `INSERT INTO vehicles (vehicle_id, plate_number, device_id, customer_id, vehicle_type, brand, model, year, color, vin, seats, transmission, fuel_type, mileage_km, registration_number, insurance_expiry, icon_type, color_hex, notes, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())
     RETURNING *`,
    [
      input.vehicleId,
      input.plateNumber ?? null,
      input.deviceId ?? null,
      input.customerId ?? null,
      input.vehicleType ?? null,
      input.brand ?? null,
      input.model ?? null,
      input.year ?? null,
      input.color ?? null,
      input.vin ?? null,
      input.seats ?? 4,
      input.transmission ?? null,
      input.fuelType ?? null,
      input.mileageKm ?? 0,
      input.registrationNumber ?? null,
      input.insuranceExpiry ?? null,
      input.iconType ?? 'car',
      input.colorHex ?? '#3B82F6',
      input.notes ?? null,
    ],
  );

export const update = async (id: number, input: UpdateVehicleInput): Promise<Vehicle | null> => {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.plateNumber !== undefined) {
    setClauses.push(`plate_number = $${paramIndex++}`);
    values.push(input.plateNumber);
  }
  if (input.deviceId !== undefined) {
    setClauses.push(`device_id = $${paramIndex++}`);
    values.push(input.deviceId);
  }
  if (input.customerId !== undefined) {
    setClauses.push(`customer_id = $${paramIndex++}`);
    values.push(input.customerId);
  }
  if (input.vehicleType !== undefined) {
    setClauses.push(`vehicle_type = $${paramIndex++}`);
    values.push(input.vehicleType);
  }
  if (input.brand !== undefined) {
    setClauses.push(`brand = $${paramIndex++}`);
    values.push(input.brand);
  }
  if (input.model !== undefined) {
    setClauses.push(`model = $${paramIndex++}`);
    values.push(input.model);
  }
  if (input.year !== undefined) {
    setClauses.push(`year = $${paramIndex++}`);
    values.push(input.year);
  }
  if (input.color !== undefined) {
    setClauses.push(`color = $${paramIndex++}`);
    values.push(input.color);
  }
  if (input.vin !== undefined) {
    setClauses.push(`vin = $${paramIndex++}`);
    values.push(input.vin);
  }
  if (input.seats !== undefined) {
    setClauses.push(`seats = $${paramIndex++}`);
    values.push(input.seats);
  }
  if (input.transmission !== undefined) {
    setClauses.push(`transmission = $${paramIndex++}`);
    values.push(input.transmission);
  }
  if (input.fuelType !== undefined) {
    setClauses.push(`fuel_type = $${paramIndex++}`);
    values.push(input.fuelType);
  }
  if (input.mileageKm !== undefined) {
    setClauses.push(`mileage_km = $${paramIndex++}`);
    values.push(input.mileageKm);
  }
  if (input.registrationNumber !== undefined) {
    setClauses.push(`registration_number = $${paramIndex++}`);
    values.push(input.registrationNumber);
  }
  if (input.insuranceExpiry !== undefined) {
    setClauses.push(`insurance_expiry = $${paramIndex++}`);
    values.push(input.insuranceExpiry);
  }
  if (input.iconType !== undefined) {
    setClauses.push(`icon_type = $${paramIndex++}`);
    values.push(input.iconType);
  }
  if (input.colorHex !== undefined) {
    setClauses.push(`color_hex = $${paramIndex++}`);
    values.push(input.colorHex);
  }
  if (input.notes !== undefined) {
    setClauses.push(`notes = $${paramIndex++}`);
    values.push(input.notes);
  }

  if (setClauses.length === 0) return findById(id);

  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  return updateOne<Vehicle>(
    `UPDATE vehicles SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values,
  );
};

export const updateDeviceAssignment = async (
  id: number,
  deviceId: string | null,
): Promise<Vehicle | null> =>
  updateOne<Vehicle>(
    'UPDATE vehicles SET device_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [deviceId, id],
  );

export const remove = async (id: number): Promise<boolean> =>
  deleteOne('DELETE FROM vehicles WHERE id = $1', [id]);
