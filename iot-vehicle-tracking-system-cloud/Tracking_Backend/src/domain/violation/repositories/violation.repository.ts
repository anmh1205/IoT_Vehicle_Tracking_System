import { findOne, findMany, updateOne } from '@/infrastructure/database/queries';
import { pool } from '@/infrastructure/database/pool';
import type { SessionUser } from '@/shared/types/common.types';
import type {
  Violation,
  ViolationListQuery,
  CreateViolationInput,
  AcknowledgeViolationInput,
} from '@/domain/violation/types/violation.types';

const hasGlobalScope = (actor: SessionUser): boolean =>
  actor.role === 'root' || actor.role === 'admin' || actor.deviceAccessMode === 'all';

// Bind actor identity. Unlinked or ambiguously linked vehicle records fail closed.
const grantPredicate = (vehicleExpression: string, userParam: string): string => `EXISTS (
  SELECT 1 FROM user_device_access uda
  WHERE uda.user_id = ${userParam}
    AND (
      EXISTS (SELECT 1 FROM vehicles linked WHERE linked.vehicle_id = ${vehicleExpression} AND linked.device_id = uda.device_id)
      OR EXISTS (SELECT 1 FROM devices linked WHERE linked.vehicle_id = ${vehicleExpression} AND linked.device_id = uda.device_id)
    )
)`;
export const findAll = async (
  query: ViolationListQuery,
  actor: SessionUser,
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
    conditions.push(`acknowledged = ${paramIndex++}`);
    params.push(query.acknowledged);
  }

  if (!hasGlobalScope(actor)) {
    conditions.push(grantPredicate('vi.vehicle_id', `${paramIndex++}`));
    params.push(actor.id);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM violations vi ${whereClause}`,
    params,
  );
  const total = parseInt(countResult.rows[0].total, 10);

  const violations = await findMany<Violation>(
    `SELECT vi.* FROM violations vi ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset],
  );

  return { violations, total };
};

export const findById = async (id: number, actor: SessionUser): Promise<Violation | null> => {
  const restricted = !hasGlobalScope(actor);
  return findOne<Violation>(
    'SELECT vi.* FROM violations vi WHERE vi.id = $1' +
      (restricted ? ' AND ' + grantPredicate('vi.vehicle_id', '$2') : ''),
    restricted ? [id, actor.id] : [id],
  );
};

export const create = async (input: CreateViolationInput, actor: SessionUser): Promise<Violation | null> => {
  const restricted = !hasGlobalScope(actor);
  const scope = restricted ? grantPredicate('$2', '$15') : 'TRUE';
  const result = await pool.query<Violation>(
    `INSERT INTO violations (alert_id, vehicle_id, driver_id, violation_type, policy_type, severity, description,
      location_lat, location_lon, speed_limit, actual_speed, fine_amount, notes, detected_at, created_at, updated_at)
     SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, COALESCE($14::timestamptz, NOW()), NOW(), NOW()
     WHERE ${scope}
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
      ...(restricted ? [actor.id] : []),
    ],
  );
  return result.rows[0] ?? null;
};

export const acknowledge = async (
  id: number,
  actor: SessionUser,
  data: AcknowledgeViolationInput,
): Promise<Violation | null> => {
  const restricted = !hasGlobalScope(actor);
  return updateOne<Violation>(
    `UPDATE violations SET acknowledged = TRUE, acknowledged_by = $1, acknowledged_at = NOW(),
      notes = COALESCE($2, notes), updated_at = NOW()
     WHERE id = $3 AND acknowledged = FALSE${restricted ? ' AND ' + grantPredicate('violations.vehicle_id', '$4') : ''} RETURNING *`,
    [actor.id, data.notes ?? null, id, ...(restricted ? [actor.id] : [])],
  );
};

export const countByVehicle = async (vehicleId: string): Promise<number> => {
  const result = await pool.query(
    'SELECT COUNT(*) as total FROM violations WHERE vehicle_id = $1',
    [vehicleId],
  );
  return parseInt(result.rows[0].total, 10);
};
