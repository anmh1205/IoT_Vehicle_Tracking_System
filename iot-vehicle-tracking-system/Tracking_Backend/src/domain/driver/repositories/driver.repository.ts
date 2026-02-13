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
