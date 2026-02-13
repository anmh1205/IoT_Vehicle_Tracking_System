import {
  findOne,
  findMany,
  insertOne,
  updateOne,
  deleteOne,
} from '@/infrastructure/database/queries';
import { pool } from '@/infrastructure/database/pool';
import type {
  Maintenance,
  MaintenanceListQuery,
  CreateMaintenanceInput,
  UpdateMaintenanceInput,
} from '@/domain/maintenance/types/maintenance.types';

export const findAll = async (
  query: MaintenanceListQuery,
): Promise<{ records: Maintenance[]; total: number }> => {
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

  if (query.vehicleId) {
    conditions.push(`vehicle_id = $${paramIndex++}`);
    params.push(query.vehicleId);
  }

  if (query.maintenanceType) {
    conditions.push(`maintenance_type = $${paramIndex++}`);
    params.push(query.maintenanceType);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM maintenance ${whereClause}`,
    params,
  );
  const total = parseInt(countResult.rows[0].total, 10);

  const records = await findMany<Maintenance>(
    `SELECT * FROM maintenance ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset],
  );

  return { records, total };
};

export const findById = async (id: number): Promise<Maintenance | null> =>
  findOne<Maintenance>('SELECT * FROM maintenance WHERE id = $1', [id]);

export const create = async (
  input: CreateMaintenanceInput,
  createdBy?: number,
): Promise<Maintenance> =>
  insertOne<Maintenance>(
    `INSERT INTO maintenance (vehicle_id, maintenance_type, title, description, scheduled_date, mileage_at_service, next_service_mileage, next_service_date, cost, service_provider, notes, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
     RETURNING *`,
    [
      input.vehicleId,
      input.maintenanceType,
      input.title,
      input.description ?? null,
      input.scheduledDate ?? null,
      input.mileageAtService ?? null,
      input.nextServiceMileage ?? null,
      input.nextServiceDate ?? null,
      input.cost ?? null,
      input.serviceProvider ?? null,
      input.notes ?? null,
      createdBy ?? null,
    ],
  );

export const update = async (
  id: number,
  input: UpdateMaintenanceInput,
): Promise<Maintenance | null> => {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.maintenanceType !== undefined) {
    setClauses.push(`maintenance_type = $${paramIndex++}`);
    values.push(input.maintenanceType);
  }
  if (input.title !== undefined) {
    setClauses.push(`title = $${paramIndex++}`);
    values.push(input.title);
  }
  if (input.description !== undefined) {
    setClauses.push(`description = $${paramIndex++}`);
    values.push(input.description);
  }
  if (input.scheduledDate !== undefined) {
    setClauses.push(`scheduled_date = $${paramIndex++}`);
    values.push(input.scheduledDate);
  }
  if (input.completedDate !== undefined) {
    setClauses.push(`completed_date = $${paramIndex++}`);
    values.push(input.completedDate);
  }
  if (input.mileageAtService !== undefined) {
    setClauses.push(`mileage_at_service = $${paramIndex++}`);
    values.push(input.mileageAtService);
  }
  if (input.nextServiceMileage !== undefined) {
    setClauses.push(`next_service_mileage = $${paramIndex++}`);
    values.push(input.nextServiceMileage);
  }
  if (input.nextServiceDate !== undefined) {
    setClauses.push(`next_service_date = $${paramIndex++}`);
    values.push(input.nextServiceDate);
  }
  if (input.cost !== undefined) {
    setClauses.push(`cost = $${paramIndex++}`);
    values.push(input.cost);
  }
  if (input.serviceProvider !== undefined) {
    setClauses.push(`service_provider = $${paramIndex++}`);
    values.push(input.serviceProvider);
  }
  if (input.notes !== undefined) {
    setClauses.push(`notes = $${paramIndex++}`);
    values.push(input.notes);
  }
  if (input.status !== undefined) {
    setClauses.push(`status = $${paramIndex++}`);
    values.push(input.status);
  }

  if (setClauses.length === 0) return findById(id);

  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  return updateOne<Maintenance>(
    `UPDATE maintenance SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values,
  );
};

export const remove = async (id: number): Promise<boolean> =>
  deleteOne('DELETE FROM maintenance WHERE id = $1', [id]);
