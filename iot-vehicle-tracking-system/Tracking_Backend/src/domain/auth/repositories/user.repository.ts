import {
  findOne,
  findMany,
  insertOne,
  updateOne,
  deleteOne,
} from '@/infrastructure/database/queries';
import type { User } from '@/domain/auth/types/auth.types';

export const findByUsername = async (username: string): Promise<User | null> =>
  findOne<User>('SELECT * FROM users WHERE username = $1', [username]);

export const findById = async (id: number): Promise<User | null> =>
  findOne<User>('SELECT * FROM users WHERE id = $1', [id]);

export const findAll = async (): Promise<User[]> =>
  findMany<User>('SELECT * FROM users ORDER BY created_at DESC');

export const create = async (
  username: string,
  passwordHash: string,
  fullName: string,
  role: string,
  deviceAccessMode: string,
  email?: string,
): Promise<User> =>
  insertOne<User>(
    `INSERT INTO users (username, password_hash, full_name, role, device_access_mode, email, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
     RETURNING *`,
    [username, passwordHash, fullName, role, deviceAccessMode, email ?? null],
  );

export const update = async (
  id: number,
  fields: Partial<
    Pick<
      User,
      | 'full_name'
      | 'role'
      | 'device_access_mode'
      | 'status'
      | 'email'
      | 'avatar_url'
      | 'preferences'
    >
  >,
): Promise<User | null> => {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (fields.full_name !== undefined) {
    setClauses.push(`full_name = $${paramIndex++}`);
    values.push(fields.full_name);
  }
  if (fields.role !== undefined) {
    setClauses.push(`role = $${paramIndex++}`);
    values.push(fields.role);
  }
  if (fields.device_access_mode !== undefined) {
    setClauses.push(`device_access_mode = $${paramIndex++}`);
    values.push(fields.device_access_mode);
  }
  if (fields.status !== undefined) {
    setClauses.push(`status = $${paramIndex++}`);
    values.push(fields.status);
  }
  if (fields.email !== undefined) {
    setClauses.push(`email = $${paramIndex++}`);
    values.push(fields.email);
  }
  if (fields.avatar_url !== undefined) {
    setClauses.push(`avatar_url = $${paramIndex++}`);
    values.push(fields.avatar_url);
  }
  if (fields.preferences !== undefined) {
    setClauses.push(`preferences = $${paramIndex++}`);
    values.push(JSON.stringify(fields.preferences));
  }

  if (setClauses.length === 0) return findById(id);

  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  return updateOne<User>(
    `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values,
  );
};

export const updatePassword = async (id: number, passwordHash: string): Promise<boolean> => {
  const result = await updateOne<User>(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
    [passwordHash, id],
  );
  return result !== null;
};

export const remove = async (id: number): Promise<boolean> =>
  deleteOne('DELETE FROM users WHERE id = $1', [id]);
