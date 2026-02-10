import { findOne, findMany, insertOne, updateOne } from '@/infrastructure/database/queries';
import type { ErrorCodeDefinition, CreateErrorCodeInput, UpdateErrorCodeInput } from '@/domain/error-code/types/error-code.types';

export const findAll = async (): Promise<ErrorCodeDefinition[]> =>
  findMany<ErrorCodeDefinition>(
    'SELECT * FROM error_code_definitions ORDER BY code ASC',
  );

export const findByCode = async (code: number): Promise<ErrorCodeDefinition | null> =>
  findOne<ErrorCodeDefinition>(
    'SELECT * FROM error_code_definitions WHERE code = $1',
    [code],
  );

export const create = async (input: CreateErrorCodeInput): Promise<ErrorCodeDefinition> =>
  insertOne<ErrorCodeDefinition>(
    `INSERT INTO error_code_definitions (code, name, name_vi, description, category, severity, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
     RETURNING *`,
    [input.code, input.name, input.nameVi, input.description ?? null, input.category, input.severity],
  );

export const update = async (
  code: number,
  data: UpdateErrorCodeInput,
): Promise<ErrorCodeDefinition | null> => {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    setClauses.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  if (data.nameVi !== undefined) {
    setClauses.push(`name_vi = $${paramIndex++}`);
    values.push(data.nameVi);
  }
  if (data.description !== undefined) {
    setClauses.push(`description = $${paramIndex++}`);
    values.push(data.description);
  }
  if (data.category !== undefined) {
    setClauses.push(`category = $${paramIndex++}`);
    values.push(data.category);
  }
  if (data.severity !== undefined) {
    setClauses.push(`severity = $${paramIndex++}`);
    values.push(data.severity);
  }

  if (setClauses.length === 0) return findByCode(code);

  setClauses.push('updated_at = NOW()');
  values.push(code);

  return updateOne<ErrorCodeDefinition>(
    `UPDATE error_code_definitions SET ${setClauses.join(', ')} WHERE code = $${paramIndex} RETURNING *`,
    values,
  );
};

export const toggleActive = async (
  code: number,
  isActive: boolean,
): Promise<ErrorCodeDefinition | null> =>
  updateOne<ErrorCodeDefinition>(
    'UPDATE error_code_definitions SET is_active = $1, updated_at = NOW() WHERE code = $2 RETURNING *',
    [isActive, code],
  );
