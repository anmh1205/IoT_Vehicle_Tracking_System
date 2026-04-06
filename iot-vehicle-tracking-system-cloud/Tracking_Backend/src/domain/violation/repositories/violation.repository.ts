import { findOne, findMany, insertOne, updateOne } from '@/infrastructure/database/queries';
import { pool } from '@/infrastructure/database/pool';
import type {
  Violation,
  ViolationListQuery,
  CreateViolationInput,
  AcknowledgeViolationInput,
} from '@/domain/violation/types/violation.types';

export const findAll = async (
  query: ViolationListQuery,
): Promise<{ violations: Violation[]; total: number }> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (query.vehicleId) {
    conditions.push(`vehicle_id = $${paramIndex++}`);
    params.push(query.vehicleId);
  }

  if (query.driverId !== undefined) {
    conditions.push(`driver_id = $${paramIndex++}`);
    params.push(query.driverId);
  }

  if (query.violationType) {
    conditions.push(`violation_type = $${paramIndex++}`);
    params.push(query.violationType);
  }

  if (query.policyType) {
    conditions.push(`policy_type = $${paramIndex++}`);
    params.push(query.policyType);
  }

  if (query.severity) {
    conditions.push(`severity = $${paramIndex++}`);
    params.push(query.severity);
  }

  if (query.acknowledged !== undefined) {
    conditions.push(`acknowledged = $${paramIndex++}`);
    params.push(query.acknowledged);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM violations ${whereClause}`,
    params,
  );
  const total = parseInt(countResult.rows[0].total, 10);

  const violations = await findMany<Violation>(
    `SELECT * FROM violations ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset],
  );

  return { violations, total };
};

export const findById = async (id: number): Promise<Violation | null> =>
  findOne<Violation>('SELECT * FROM violations WHERE id = $1', [id]);

export const create = async (input: CreateViolationInput): Promise<Violation> =>
  insertOne<Violation>(
    `INSERT INTO violations (alert_id, vehicle_id, driver_id, violation_type, policy_type, severity, description,
      location_lat, location_lon, speed_limit, actual_speed, fine_amount, notes, detected_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, COALESCE($14, NOW()), NOW(), NOW())
     RETURNING *`,
    [
      input.alertId ?? null,
      input.vehicleId ?? null,
      input.driverId ?? null,
      input.violationType,
      input.violationType.startsWith('policy_')
        ? input.violationType.replace('policy_', '').toUpperCase()
        : null,
      input.severity ?? 'medium',
      input.description ?? null,
      input.locationLat ?? null,
      input.locationLon ?? null,
      input.speedLimit ?? null,
      input.actualSpeed ?? null,
      input.fineAmount ?? 0,
      input.notes ?? null,
      new Date().toISOString(),
    ],
  );

export const acknowledge = async (
  id: number,
  userId: number,
  data: AcknowledgeViolationInput,
): Promise<Violation | null> =>
  updateOne<Violation>(
    `UPDATE violations SET acknowledged = TRUE, acknowledged_by = $1, acknowledged_at = NOW(),
      notes = COALESCE($2, notes), updated_at = NOW()
     WHERE id = $3 RETURNING *`,
    [userId, data.notes ?? null, id],
  );

export const countByVehicle = async (vehicleId: string): Promise<number> => {
  const result = await pool.query(
    'SELECT COUNT(*) as total FROM violations WHERE vehicle_id = $1',
    [vehicleId],
  );
  return parseInt(result.rows[0].total, 10);
};
