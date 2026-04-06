import { findMany, findOne, insertOne, updateOne } from '@/infrastructure/database/queries';
import type {
  CreateVehiclePolicyInput,
  UpdateVehiclePolicyInput,
  VehiclePolicy,
  VehiclePolicyListQuery,
} from '@/domain/geofence/types/geofence.types';

const parseDate = (value?: string): string | null => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date value: ${value}`);
  }
  return parsed.toISOString();
};

export const listPolicies = async (
  query: VehiclePolicyListQuery,
): Promise<{ policies: VehiclePolicy[]; total: number }> => {
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
  if (query.policyType) {
    conditions.push(`policy_type = $${paramIndex++}`);
    params.push(query.policyType);
  }
  if (query.status) {
    conditions.push(`status = $${paramIndex++}`);
    params.push(query.status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const totalResult = await findOne<{ total: string }>(
    `SELECT COUNT(*)::text as total FROM vehicle_policies ${whereClause}`,
    params,
  );
  const total = Number.parseInt(totalResult?.total ?? '0', 10);

  const policies = await findMany<VehiclePolicy>(
    `SELECT * FROM vehicle_policies ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset],
  );

  return { policies, total };
};

export const getPolicyById = async (id: number): Promise<VehiclePolicy | null> =>
  findOne<VehiclePolicy>('SELECT * FROM vehicle_policies WHERE id = $1', [id]);

export const listActivePoliciesByVehicle = async (vehicleId: string): Promise<VehiclePolicy[]> =>
  findMany<VehiclePolicy>(
    `SELECT *
     FROM vehicle_policies
     WHERE vehicle_id = $1
       AND status = 'active'
       AND (effective_from IS NULL OR effective_from <= NOW())
       AND (effective_to IS NULL OR effective_to > NOW())
     ORDER BY created_at ASC`,
    [vehicleId],
  );

export const createPolicy = async (
  input: CreateVehiclePolicyInput,
  actorId?: number,
): Promise<VehiclePolicy> =>
  insertOne<VehiclePolicy>(
    `INSERT INTO vehicle_policies (
      vehicle_id, policy_type, status, params_json, effective_from, effective_to, created_by, updated_by, created_at, updated_at
    ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $7, NOW(), NOW())
     RETURNING *`,
    [
      input.vehicleId,
      input.policyType,
      input.status ?? 'active',
      JSON.stringify(input.params),
      parseDate(input.effectiveFrom),
      parseDate(input.effectiveTo),
      actorId ?? null,
    ],
  );

export const updatePolicy = async (
  id: number,
  input: UpdateVehiclePolicyInput,
  actorId?: number,
): Promise<VehiclePolicy | null> => {
  const clauses: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (input.status !== undefined) {
    clauses.push(`status = $${paramIndex++}`);
    params.push(input.status);
  }
  if (input.params !== undefined) {
    clauses.push(`params_json = $${paramIndex++}::jsonb`);
    params.push(JSON.stringify(input.params));
  }
  if (input.effectiveFrom !== undefined) {
    clauses.push(`effective_from = $${paramIndex++}`);
    params.push(parseDate(input.effectiveFrom));
  }
  if (input.effectiveTo !== undefined) {
    clauses.push(`effective_to = $${paramIndex++}`);
    params.push(parseDate(input.effectiveTo));
  }

  if (clauses.length === 0) {
    return getPolicyById(id);
  }

  clauses.push(`updated_by = $${paramIndex++}`);
  params.push(actorId ?? null);
  clauses.push('updated_at = NOW()');
  params.push(id);

  return updateOne<VehiclePolicy>(
    `UPDATE vehicle_policies SET ${clauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    params,
  );
};
