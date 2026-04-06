import { pool } from '@/infrastructure/database/pool';
import { findMany, findOne, insertOne } from '@/infrastructure/database/queries';
import type {
  VehiclePolicyViolation,
  VehiclePolicyViolationQuery,
} from '@/domain/geofence/types/geofence.types';

export const listPolicyViolations = async (
  query: VehiclePolicyViolationQuery,
): Promise<{ violations: VehiclePolicyViolation[]; total: number }> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const offset = (page - 1) * limit;

  const conditions: string[] = ['policy_id IS NOT NULL'];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (query.vehicleId) {
    conditions.push(`vehicle_id = $${paramIndex++}`);
    params.push(query.vehicleId);
  }
  if (query.policyType) {
    conditions.push(`policy_type = $${paramIndex++}`);
    params.push(query.policyType);
  }
  if (query.status) {
    conditions.push(`CASE WHEN acknowledged = TRUE AND resolved_at IS NULL THEN 'acknowledged' WHEN resolved_at IS NOT NULL THEN 'resolved' ELSE 'open' END = $${paramIndex++}`);
    params.push(query.status);
  }
  if (query.acknowledged !== undefined) {
    conditions.push(`acknowledged = $${paramIndex++}`);
    params.push(query.acknowledged);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const totalResult = await findOne<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM violations ${whereClause}`,
    params,
  );
  const total = Number.parseInt(totalResult?.total ?? '0', 10);

  const violations = await findMany<VehiclePolicyViolation>(
    `SELECT
      id,
      policy_id,
      vehicle_id,
      policy_type,
      violation_type AS violation_kind,
      severity,
      CASE
        WHEN resolved_at IS NOT NULL THEN 'resolved'
        WHEN acknowledged = TRUE THEN 'acknowledged'
        ELSE 'open'
      END AS status,
      COALESCE(detected_at, created_at) AS detected_at,
      confirmed_at,
      resolved_at,
      evidence_json,
      COALESCE(dedupe_key, CONCAT('legacy-', id)) AS dedupe_key,
      correlation_id,
      created_at,
      updated_at
     FROM violations ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset],
  );

  return { violations, total };
};

export const createPolicyViolation = async (params: {
  policyId: number;
  vehicleId: string;
  policyType: 'ADMIN_BOUNDARY' | 'RADIUS' | 'DISTANCE_QUOTA';
  violationKind: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  locationLat: number | null;
  locationLon: number | null;
  evidence: Record<string, unknown> | null;
  dedupeKey: string;
  correlationId: string;
}): Promise<VehiclePolicyViolation | null> => {
  await pool.query(
    `INSERT INTO violations (
      vehicle_id, violation_type, policy_type, policy_id, severity, description,
      location_lat, location_lon, evidence_json, dedupe_key, correlation_id, detected_at, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, NOW(), NOW(), NOW())
    ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING`,
    [
      params.vehicleId,
      params.violationKind,
      params.policyType,
      params.policyId,
      params.severity,
      params.description,
      params.locationLat,
      params.locationLon,
      params.evidence ? JSON.stringify(params.evidence) : null,
      params.dedupeKey,
      params.correlationId,
    ],
  );

  return findOne<VehiclePolicyViolation>(
    `SELECT
      id,
      policy_id,
      vehicle_id,
      policy_type,
      violation_type AS violation_kind,
      severity,
      CASE
        WHEN resolved_at IS NOT NULL THEN 'resolved'
        WHEN acknowledged = TRUE THEN 'acknowledged'
        ELSE 'open'
      END AS status,
      COALESCE(detected_at, created_at) AS detected_at,
      confirmed_at,
      resolved_at,
      evidence_json,
      dedupe_key,
      correlation_id,
      created_at,
      updated_at
     FROM violations
     WHERE dedupe_key = $1`,
    [params.dedupeKey],
  );
};

export const upsertPolicyAudit = async (params: {
  actorId: number | null;
  action: string;
  policyId?: number | null;
  vehicleId?: string | null;
  before?: unknown;
  after?: unknown;
  correlationId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> => {
  await insertOne(
    `INSERT INTO policy_audit_logs (
      actor_id, action, policy_id, vehicle_id, before_json, after_json, correlation_id, ip_address, user_agent, created_at
    ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9, NOW())
    RETURNING id`,
    [
      params.actorId,
      params.action,
      params.policyId ?? null,
      params.vehicleId ?? null,
      params.before ? JSON.stringify(params.before) : null,
      params.after ? JSON.stringify(params.after) : null,
      params.correlationId ?? null,
      params.ipAddress ?? null,
      params.userAgent ?? null,
    ],
  );
};
