export interface Geofence {
  id: number;
  name: string;
  description: string | null;
  geofence_type: 'circle' | 'polygon' | 'rectangle';
  center_latitude: number | null;
  center_longitude: number | null;
  radius_meters: number | null;
  coordinates: unknown | null;
  trigger_on: 'enter' | 'exit' | 'both';
  is_active: boolean;
  notify_email: boolean;
  notify_push: boolean;
  color: string;
  display_hidden: boolean;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface GeofencePublic {
  id: number;
  name: string;
  description: string | null;
  geofenceType: 'circle' | 'polygon' | 'rectangle';
  centerLatitude: number | null;
  centerLongitude: number | null;
  radiusMeters: number | null;
  coordinates: unknown | null;
  triggerOn: 'enter' | 'exit' | 'both';
  isActive: boolean;
  notifyEmail: boolean;
  notifyPush: boolean;
  color: string;
  displayHidden: boolean;
  createdBy: number | null;
  vehicleIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateGeofenceInput {
  name: string;
  geofenceType?: string;
  centerLatitude?: number;
  centerLongitude?: number;
  radiusMeters?: number;
  coordinates?: unknown;
  triggerOn?: string;
  notifyEmail?: boolean;
  notifyPush?: boolean;
  color?: string;
  description?: string;
}

export interface UpdateGeofenceInput extends Partial<CreateGeofenceInput> {
  isActive?: boolean;
  displayHidden?: boolean;
}

export interface GeofenceListQuery {
  page?: number;
  limit?: number;
  isActive?: boolean;
  geofenceType?: string;
  search?: string;
}

export type VehiclePolicyType = 'ADMIN_BOUNDARY' | 'RADIUS' | 'DISTANCE_QUOTA';

export type VehiclePolicyStatus = 'draft' | 'active' | 'paused' | 'disabled';

export interface VehiclePolicy {
  id: number;
  vehicle_id: string;
  policy_type: VehiclePolicyType;
  status: VehiclePolicyStatus;
  params_json: Record<string, unknown>;
  effective_from: Date | null;
  effective_to: Date | null;
  created_by: number | null;
  updated_by: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface VehiclePolicyPublic {
  id: number;
  vehicleId: string;
  policyType: VehiclePolicyType;
  status: VehiclePolicyStatus;
  params: Record<string, unknown>;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVehiclePolicyInput {
  vehicleId: string;
  policyType: VehiclePolicyType;
  status?: VehiclePolicyStatus;
  params: Record<string, unknown>;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface UpdateVehiclePolicyInput extends Partial<CreateVehiclePolicyInput> {}

export interface VehiclePolicyListQuery {
  page?: number;
  limit?: number;
  vehicleId?: string;
  policyType?: VehiclePolicyType;
  status?: VehiclePolicyStatus;
}

export interface VehiclePolicyState {
  id: number;
  vehicle_id: string;
  policy_id: number;
  spatial_state: 'INSIDE' | 'OUTSIDE' | 'UNKNOWN' | 'GPS_SUSPECT';
  quota_state: 'UNDER_LIMIT' | 'NEAR_LIMIT' | 'EXCEEDED';
  consumed_m: number;
  cycle_start_at: Date | null;
  cycle_end_at: Date | null;
  last_good_fix_at: Date | null;
  last_evaluated_at: Date | null;
  last_lat: number | null;
  last_lon: number | null;
  last_reason_code: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface VehiclePolicyStatePublic {
  id: number;
  vehicleId: string;
  policyId: number;
  policyType: VehiclePolicyType;
  spatialState: 'INSIDE' | 'OUTSIDE' | 'UNKNOWN' | 'GPS_SUSPECT';
  quotaState: 'UNDER_LIMIT' | 'NEAR_LIMIT' | 'EXCEEDED';
  consumedMeters: number;
  consumedKm: number;
  cycleStartAt: string | null;
  cycleEndAt: string | null;
  lastGoodFixAt: string | null;
  lastEvaluatedAt: string | null;
  lastReasonCode: string | null;
  updatedAt: string;
}

export interface VehiclePolicyViolation {
  id: number;
  policy_id: number;
  vehicle_id: string;
  policy_type: VehiclePolicyType;
  violation_kind: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'acknowledged' | 'resolved';
  detected_at: Date;
  confirmed_at: Date | null;
  resolved_at: Date | null;
  evidence_json: Record<string, unknown> | null;
  dedupe_key: string;
  correlation_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface VehiclePolicyViolationPublic {
  id: number;
  policyId: number;
  vehicleId: string;
  policyType: VehiclePolicyType;
  violationKind: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'acknowledged' | 'resolved';
  detectedAt: string;
  confirmedAt: string | null;
  resolvedAt: string | null;
  evidence: Record<string, unknown> | null;
  dedupeKey: string;
  correlationId: string | null;
  updatedAt: string;
}

export interface VehiclePolicyViolationQuery {
  page?: number;
  limit?: number;
  vehicleId?: string;
  policyType?: VehiclePolicyType;
  status?: 'open' | 'acknowledged' | 'resolved';
  acknowledged?: boolean;
}
