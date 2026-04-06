import { createNotFoundError } from '@/shared/utils/errors.util';
import * as vehiclePolicyRepo from '@/domain/geofence/repositories/vehicle-policy.repository';
import * as policyStateRepo from '@/domain/geofence/repositories/vehicle-policy-state.repository';
import * as policyViolationRepo from '@/domain/geofence/repositories/vehicle-policy-violation.repository';
import type {
  CreateVehiclePolicyInput,
  UpdateVehiclePolicyInput,
  VehiclePolicy,
  VehiclePolicyListQuery,
  VehiclePolicyPublic,
  VehiclePolicyStatePublic,
  VehiclePolicyViolationPublic,
  VehiclePolicyViolationQuery,
} from '@/domain/geofence/types/geofence.types';
import type { PolicyStateWithType } from '@/domain/geofence/repositories/vehicle-policy-state.repository';

const sanitizeVehiclePolicy = (policy: VehiclePolicy): VehiclePolicyPublic => ({
  id: policy.id,
  vehicleId: policy.vehicle_id,
  policyType: policy.policy_type,
  status: policy.status,
  params: (typeof policy.params_json === 'string'
    ? JSON.parse(policy.params_json)
    : policy.params_json) as Record<string, unknown>,
  effectiveFrom: policy.effective_from?.toISOString() ?? null,
  effectiveTo: policy.effective_to?.toISOString() ?? null,
  createdBy: policy.created_by,
  updatedBy: policy.updated_by,
  createdAt: policy.created_at.toISOString(),
  updatedAt: policy.updated_at.toISOString(),
});

const sanitizePolicyState = (state: PolicyStateWithType): VehiclePolicyStatePublic => ({
  id: state.id,
  vehicleId: state.vehicle_id,
  policyId: state.policy_id,
  policyType: state.policy_type,
  spatialState: state.spatial_state,
  quotaState: state.quota_state,
  consumedMeters: state.consumed_m,
  consumedKm: Number((state.consumed_m / 1000).toFixed(3)),
  cycleStartAt: state.cycle_start_at?.toISOString() ?? null,
  cycleEndAt: state.cycle_end_at?.toISOString() ?? null,
  lastGoodFixAt: state.last_good_fix_at?.toISOString() ?? null,
  lastEvaluatedAt: state.last_evaluated_at?.toISOString() ?? null,
  lastReasonCode: state.last_reason_code,
  updatedAt: state.updated_at.toISOString(),
});

export const listVehiclePolicies = async (
  query: VehiclePolicyListQuery,
): Promise<{
  items: VehiclePolicyPublic[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const result = await vehiclePolicyRepo.listPolicies(query);

  return {
    items: result.policies.map(sanitizeVehiclePolicy),
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
    },
  };
};

export const getVehiclePolicyById = async (id: number): Promise<VehiclePolicyPublic> => {
  const policy = await vehiclePolicyRepo.getPolicyById(id);
  if (!policy) {
    throw createNotFoundError(`Policy with ID ${id} not found`);
  }
  return sanitizeVehiclePolicy(policy);
};

export const createVehiclePolicy = async (
  input: CreateVehiclePolicyInput,
  actorId?: number,
): Promise<VehiclePolicyPublic> => {
  const policy = await vehiclePolicyRepo.createPolicy(input, actorId);
  await policyViolationRepo.upsertPolicyAudit({
    actorId: actorId ?? null,
    action: 'policy.create',
    policyId: policy.id,
    vehicleId: policy.vehicle_id,
    before: null,
    after: sanitizeVehiclePolicy(policy),
  });

  return sanitizeVehiclePolicy(policy);
};

export const updateVehiclePolicy = async (
  id: number,
  input: UpdateVehiclePolicyInput,
  actorId?: number,
): Promise<VehiclePolicyPublic> => {
  const before = await vehiclePolicyRepo.getPolicyById(id);
  if (!before) {
    throw createNotFoundError(`Policy with ID ${id} not found`);
  }

  const updated = await vehiclePolicyRepo.updatePolicy(id, input, actorId);
  if (!updated) {
    throw createNotFoundError(`Policy with ID ${id} not found`);
  }

  await policyViolationRepo.upsertPolicyAudit({
    actorId: actorId ?? null,
    action: 'policy.update',
    policyId: updated.id,
    vehicleId: updated.vehicle_id,
    before: sanitizeVehiclePolicy(before),
    after: sanitizeVehiclePolicy(updated),
  });

  return sanitizeVehiclePolicy(updated);
};

export const listVehiclePolicyStates = async (vehicleId: string): Promise<VehiclePolicyStatePublic[]> => {
  const states = await policyStateRepo.listPolicyStatesByVehicle(vehicleId);
  return states.map(sanitizePolicyState);
};

export const listVehiclePolicyViolations = async (
  query: VehiclePolicyViolationQuery,
): Promise<{
  items: VehiclePolicyViolationPublic[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const result = await policyViolationRepo.listPolicyViolations(query);

  return {
    items: result.violations.map((item) => ({
      id: item.id,
      policyId: item.policy_id,
      vehicleId: item.vehicle_id,
      policyType: item.policy_type,
      violationKind: item.violation_kind,
      severity: item.severity,
      status: item.status,
      detectedAt: item.detected_at.toISOString(),
      confirmedAt: item.confirmed_at?.toISOString() ?? null,
      resolvedAt: item.resolved_at?.toISOString() ?? null,
      evidence: item.evidence_json,
      dedupeKey: item.dedupe_key,
      correlationId: item.correlation_id,
      updatedAt: item.updated_at.toISOString(),
    })),
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
    },
  };
};
