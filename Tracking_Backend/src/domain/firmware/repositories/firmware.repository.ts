import { pool } from '@/infrastructure/database/pool';
import { findOne, findMany, insertOne, updateOne, deleteOne } from '@/infrastructure/database/queries';
import type { Firmware, CreateFirmwareInput, FirmwareListQuery } from '@/domain/firmware/types/firmware.types';

interface CountRow {
  count: string;
}

export const findAll = async (
  query: FirmwareListQuery,
): Promise<{ firmwares: Firmware[]; total: number }> => {
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

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query<CountRow>(
    `SELECT COUNT(*)::text as count FROM firmwares ${whereClause}`,
    params,
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const firmwares = await findMany<Firmware>(
    `SELECT * FROM firmwares ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset],
  );

  return { firmwares, total };
};

export const findById = async (id: number): Promise<Firmware | null> =>
  findOne<Firmware>('SELECT * FROM firmwares WHERE id = $1', [id]);

export const findByVersion = async (version: string): Promise<Firmware | null> =>
  findOne<Firmware>('SELECT * FROM firmwares WHERE version = $1', [version]);

export const create = async (input: CreateFirmwareInput): Promise<Firmware> =>
  insertOne<Firmware>(
    `INSERT INTO firmwares (version, filename, size, sha256, description, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, false, NOW(), NOW())
     RETURNING *`,
    [input.version, input.filename, input.size, input.sha256, input.description ?? null],
  );

export const update = async (
  id: number,
  data: Partial<CreateFirmwareInput>,
): Promise<Firmware | null> => {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.version !== undefined) {
    setClauses.push(`version = $${paramIndex++}`);
    values.push(data.version);
  }
  if (data.filename !== undefined) {
    setClauses.push(`filename = $${paramIndex++}`);
    values.push(data.filename);
  }
  if (data.size !== undefined) {
    setClauses.push(`size = $${paramIndex++}`);
    values.push(data.size);
  }
  if (data.sha256 !== undefined) {
    setClauses.push(`sha256 = $${paramIndex++}`);
    values.push(data.sha256);
  }
  if (data.description !== undefined) {
    setClauses.push(`description = $${paramIndex++}`);
    values.push(data.description);
  }

  if (setClauses.length === 0) return findById(id);

  setClauses.push('updated_at = NOW()');
  values.push(id);

  return updateOne<Firmware>(
    `UPDATE firmwares SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values,
  );
};

export const remove = async (id: number): Promise<boolean> =>
  deleteOne('DELETE FROM firmwares WHERE id = $1', [id]);

export const activate = async (id: number): Promise<Firmware | null> =>
  updateOne<Firmware>(
    'UPDATE firmwares SET is_active = true, updated_at = NOW() WHERE id = $1 RETURNING *',
    [id],
  );

export const deactivate = async (id: number): Promise<Firmware | null> =>
  updateOne<Firmware>(
    'UPDATE firmwares SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING *',
    [id],
  );
