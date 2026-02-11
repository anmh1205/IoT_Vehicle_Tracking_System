import {
  findOne,
  findMany,
  insertOne,
} from '@/infrastructure/database/queries';
import { pool } from '@/infrastructure/database/pool';
import type {
  ValidationError,
  CreateValidationErrorInput,
  ValidationErrorListQuery,
} from '@/domain/validation-error/types/validation-error.types';

export const insert = async (input: CreateValidationErrorInput): Promise<ValidationError> =>
  insertOne<ValidationError>(
    `INSERT INTO validation_errors (correlation_id, device_id, validation_type, field_name, expected_value, actual_value, payload_hash, payload_sample)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      input.correlationId ?? null,
      input.deviceId ?? null,
      input.validationType,
      input.fieldName ?? null,
      input.expectedValue ?? null,
      input.actualValue ?? null,
      input.payloadHash ?? null,
      input.payloadSample ? JSON.stringify(input.payloadSample) : null,
    ],
  );

export const findByDeviceId = async (
  query: ValidationErrorListQuery,
): Promise<{ errors: ValidationError[]; total: number }> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (query.deviceId) {
    conditions.push(`device_id = $${paramIndex++}`);
    params.push(query.deviceId);
  }

  if (query.validationType) {
    conditions.push(`validation_type = $${paramIndex++}`);
    params.push(query.validationType);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM validation_errors ${whereClause}`,
    params,
  );
  const total = parseInt(countResult.rows[0].total, 10);

  const errors = await findMany<ValidationError>(
    `SELECT * FROM validation_errors ${whereClause} ORDER BY server_timestamp DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset],
  );

  return { errors, total };
};

export const findById = async (id: number): Promise<ValidationError | null> =>
  findOne<ValidationError>('SELECT * FROM validation_errors WHERE id = $1', [id]);
