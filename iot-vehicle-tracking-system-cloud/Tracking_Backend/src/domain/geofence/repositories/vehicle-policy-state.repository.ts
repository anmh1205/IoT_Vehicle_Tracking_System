import { findMany, findOne } from '@/infrastructure/database/queries';
import type { VehiclePolicyState } from '@/domain/geofence/types/geofence.types';

export type PolicyStateWithType = VehiclePolicyState & {
  policy_type: 'ADMIN_BOUNDARY' | 'RADIUS' | 'DISTANCE_QUOTA';
};

export const getPolicyState = async (
  vehicleId: string,
  policyId: number,
): Promise<VehiclePolicyState | null> =>
  findOne<VehiclePolicyState>(
    'SELECT * FROM vehicle_policy_state WHERE vehicle_id = $1 AND policy_id = $2',
    [vehicleId, policyId],
  );

export const upsertPolicyState = async (params: {
  vehicleId: string;
  policyId: number;
  spatialState: 'INSIDE' | 'OUTSIDE' | 'UNKNOWN' | 'GPS_SUSPECT';
  quotaState: 'UNDER_LIMIT' | 'NEAR_LIMIT' | 'EXCEEDED';
  consumedMeters: number;
  cycleStartAt: Date | null;
  cycleEndAt: Date | null;
  lastGoodFixAt: Date | null;
  lastEvaluatedAt: Date;
  lastLat: number | null;
  lastLon: number | null;
  lastReasonCode: string | null;
  enforceExpectedLastEvaluatedAt?: boolean;
  expectedLastEvaluatedAt?: Date | null;
}): Promise<VehiclePolicyState | null> =>
  findOne<VehiclePolicyState>(
    `INSERT INTO vehicle_policy_state (
      vehicle_id, policy_id, spatial_state, quota_state, consumed_m, cycle_start_at, cycle_end_at,
      last_good_fix_at, last_evaluated_at, last_lat, last_lon, last_reason_code, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
    ON CONFLICT (vehicle_id, policy_id)
    DO UPDATE SET
      spatial_state = EXCLUDED.spatial_state,
      quota_state = EXCLUDED.quota_state,
      consumed_m = EXCLUDED.consumed_m,
      cycle_start_at = EXCLUDED.cycle_start_at,
      cycle_end_at = EXCLUDED.cycle_end_at,
      last_good_fix_at = EXCLUDED.last_good_fix_at,
      last_evaluated_at = EXCLUDED.last_evaluated_at,
      last_lat = EXCLUDED.last_lat,
      last_lon = EXCLUDED.last_lon,
      last_reason_code = EXCLUDED.last_reason_code,
      updated_at = NOW()
    WHERE
      NOT $13::boolean
      OR vehicle_policy_state.last_evaluated_at IS NOT DISTINCT FROM $14::timestamptz
    RETURNING *`,
    [
      params.vehicleId,
      params.policyId,
      params.spatialState,
      params.quotaState,
      params.consumedMeters,
      params.cycleStartAt?.toISOString() ?? null,
      params.cycleEndAt?.toISOString() ?? null,
      params.lastGoodFixAt?.toISOString() ?? null,
      params.lastEvaluatedAt.toISOString(),
      params.lastLat,
      params.lastLon,
      params.lastReasonCode,
      params.enforceExpectedLastEvaluatedAt ?? false,
      params.expectedLastEvaluatedAt?.toISOString() ?? null,
    ],
  );

export const listPolicyStatesByVehicle = async (
  vehicleId: string,
): Promise<PolicyStateWithType[]> =>
  findMany<PolicyStateWithType>(
    `SELECT s.*, p.policy_type
     FROM vehicle_policy_state s
     JOIN vehicle_policies p ON p.id = s.policy_id
     WHERE s.vehicle_id = $1 AND p.status = 'active'
     ORDER BY s.updated_at DESC`,
    [vehicleId],
  );
