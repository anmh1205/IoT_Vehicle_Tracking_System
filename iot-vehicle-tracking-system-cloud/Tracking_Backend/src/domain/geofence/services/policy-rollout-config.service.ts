import type { VehiclePolicyType } from '@/domain/geofence/types/geofence.types';

export type PolicyEnforcementMode = 'shadow' | 'soft_alert' | 'enforced';

const POLICY_ENFORCEMENT_MATRIX: Record<VehiclePolicyType, PolicyEnforcementMode> = {
  ADMIN_BOUNDARY: 'enforced',
  RADIUS: 'soft_alert',
  DISTANCE_QUOTA: 'soft_alert',
};

export const getPolicyEnforcementMode = (
  policyType: VehiclePolicyType,
): PolicyEnforcementMode => POLICY_ENFORCEMENT_MATRIX[policyType];

export const getPolicyViolationSeverity = (
  policyType: VehiclePolicyType,
): 'low' | 'medium' | 'high' | 'critical' => {
  const mode = getPolicyEnforcementMode(policyType);
  if (mode === 'shadow') return 'low';
  if (mode === 'soft_alert') return 'medium';
  if (policyType === 'ADMIN_BOUNDARY') return 'high';
  return 'critical';
};
