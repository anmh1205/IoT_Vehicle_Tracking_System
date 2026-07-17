import { randomUUID } from 'node:crypto';
import { createLogger } from '@/infrastructure/logger';
import {
  policyEvalDurationSeconds,
  policyEvalTotal,
  policyQuotaResetTotal,
  policyViolationsTotal,
} from '@/infrastructure/metrics/app-metrics';
import { pointInPolygon, pointOnPolygonBoundary, computeDistanceMeters } from '@/shared/utils/geo.util';
import * as vehiclePolicyRepo from '@/domain/geofence/repositories/vehicle-policy.repository';
import * as policyStateRepo from '@/domain/geofence/repositories/vehicle-policy-state.repository';
import * as policyViolationRepo from '@/domain/geofence/repositories/vehicle-policy-violation.repository';
import { getPolicyEnforcementMode, getPolicyViolationSeverity } from './policy-rollout-config.service';
import type {
  VehiclePolicy,
  VehiclePolicyState,
  VehiclePolicyType,
  VehiclePolicyViolation,
} from '@/domain/geofence/types/geofence.types';

const log = createLogger('policy-evaluator');

const DEFAULT_HYSTERESIS_METERS = 10;
const DEFAULT_GPS_GRACE_MS = 120_000;
const DEFAULT_NEAR_LIMIT_THRESHOLD = 0.9;
const MAX_SEGMENT_GAP_MS = 180_000;
const TIMEZONE_OFFSET_HOURS = 7;

const withTimer = async <T>(
  policyType: VehiclePolicyType,
  handler: () => Promise<T>,
): Promise<T> => {
  const endTimer = policyEvalDurationSeconds.startTimer({ policy_type: policyType });
  try {
    const result = await handler();
    policyEvalTotal.inc({ policy_type: policyType, result: 'success' });
    return result;
  } catch (error) {
    policyEvalTotal.inc({ policy_type: policyType, result: 'error' });
    throw error;
  } finally {
    endTimer();
  }
};

export interface TelemetryContext {
  vehicleId: string;
  deviceId: string;
  lat: number;
  lon: number;
  timestamp: Date;
}

interface EvaluateResult {
  policyId: number;
  policyType: VehiclePolicyType;
  spatialState: 'INSIDE' | 'OUTSIDE' | 'UNKNOWN' | 'GPS_SUSPECT';
  quotaState: 'UNDER_LIMIT' | 'NEAR_LIMIT' | 'EXCEEDED';
  consumedMeters: number;
  reasonCode: string;
  violation: VehiclePolicyViolation | null;
}

const toObject = (value: unknown): Record<string, unknown> => {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  if (typeof value === 'object') return value as Record<string, unknown>;
  return {};
};

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toStringArrayCoordinates = (value: unknown): [number, number][] => {
  const obj = toObject(value);
  const raw = obj.coordinates;
  if (!Array.isArray(raw)) return [];

  const result: [number, number][] = [];
  for (const point of raw) {
    if (!Array.isArray(point) || point.length < 2) continue;
    const lat = toNumber(point[0]);
    const lon = toNumber(point[1]);
    if (lat === null || lon === null) continue;
    result.push([lat, lon]);
  }
  return result;
};

const buildCycleWindow = (now: Date, cycle: string): { start: Date; end: Date } => {
  const local = new Date(now.getTime() + TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth();
  const date = local.getUTCDate();

  if (cycle === 'monthly') {
    const startLocal = new Date(Date.UTC(year, month, 1, 0, 0, 0));
    const endLocal = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0));
    return {
      start: new Date(startLocal.getTime() - TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000),
      end: new Date(endLocal.getTime() - TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000),
    };
  }

  const startLocal = new Date(Date.UTC(year, month, date, 0, 0, 0));
  const endLocal = new Date(Date.UTC(year, month, date + 1, 0, 0, 0));
  return {
    start: new Date(startLocal.getTime() - TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000),
    end: new Date(endLocal.getTime() - TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000),
  };
};

const isGpsSuspect = (state: VehiclePolicyState | null, now: Date): boolean => {
  if (!state?.last_good_fix_at) return false;
  const gap = now.getTime() - new Date(state.last_good_fix_at).getTime();
  return gap > DEFAULT_GPS_GRACE_MS;
};

const evaluateRadius = (
  policy: VehiclePolicy,
  state: VehiclePolicyState | null,
  telemetry: TelemetryContext,
): { spatialState: 'INSIDE' | 'OUTSIDE' | 'UNKNOWN' | 'GPS_SUSPECT'; reasonCode: string } => {
  if (isGpsSuspect(state, telemetry.timestamp)) {
    return { spatialState: 'GPS_SUSPECT', reasonCode: 'GPS_GRACE_EXPIRED' };
  }

  const params = toObject(policy.params_json);
  const centerLat = toNumber(params.centerLat);
  const centerLon = toNumber(params.centerLon);
  const radiusMeters = toNumber(params.radiusMeters);
  const hysteresis = toNumber(params.hysteresisMeters) ?? DEFAULT_HYSTERESIS_METERS;

  if (centerLat === null || centerLon === null || radiusMeters === null) {
    return { spatialState: 'UNKNOWN', reasonCode: 'INVALID_POLICY_PARAMS' };
  }

  const distance = computeDistanceMeters(telemetry.lat, telemetry.lon, centerLat, centerLon);
  const radiusIn = Math.max(radiusMeters - hysteresis, 0);
  const radiusOut = radiusMeters + hysteresis;

  if (distance <= radiusIn) {
    return { spatialState: 'INSIDE', reasonCode: 'RADIUS_INSIDE' };
  }
  if (distance >= radiusOut) {
    return { spatialState: 'OUTSIDE', reasonCode: 'RADIUS_OUTSIDE' };
  }

  return {
    spatialState: state?.spatial_state ?? 'UNKNOWN',
    reasonCode: 'RADIUS_HYSTERESIS_HOLD',
  };
};

const evaluateAdminBoundary = (
  policy: VehiclePolicy,
  state: VehiclePolicyState | null,
  telemetry: TelemetryContext,
): { spatialState: 'INSIDE' | 'OUTSIDE' | 'UNKNOWN' | 'GPS_SUSPECT'; reasonCode: string } => {
  if (isGpsSuspect(state, telemetry.timestamp)) {
    return { spatialState: 'GPS_SUSPECT', reasonCode: 'GPS_GRACE_EXPIRED' };
  }

  const params = toObject(policy.params_json);
  const polygon = toStringArrayCoordinates(params);
  if (polygon.length < 3) {
    return { spatialState: 'UNKNOWN', reasonCode: 'INVALID_BOUNDARY_POLYGON' };
  }

  const point: [number, number] = [telemetry.lat, telemetry.lon];
  const inside = pointInPolygon(point, polygon);
  const onBoundary = pointOnPolygonBoundary(point, polygon);

  if (onBoundary) {
    return { spatialState: 'OUTSIDE', reasonCode: 'BOUNDARY_STRICT_OUTSIDE' };
  }

  return {
    spatialState: inside ? 'INSIDE' : 'OUTSIDE',
    reasonCode: inside ? 'BOUNDARY_INSIDE' : 'BOUNDARY_OUTSIDE',
  };
};

const evaluateDistanceQuota = (
  policy: VehiclePolicy,
  state: VehiclePolicyState | null,
  telemetry: TelemetryContext,
): {
  quotaState: 'UNDER_LIMIT' | 'NEAR_LIMIT' | 'EXCEEDED';
  consumedMeters: number;
  cycleStartAt: Date | null;
  cycleEndAt: Date | null;
  reasonCode: string;
} => {
  const params = toObject(policy.params_json);
  const limitKm = toNumber(params.limitKm);
  const cycle = String(params.cycle ?? 'daily');

  if (limitKm === null || limitKm <= 0) {
    return {
      quotaState: 'UNDER_LIMIT',
      consumedMeters: state?.consumed_m ?? 0,
      cycleStartAt: state?.cycle_start_at ? new Date(state.cycle_start_at) : null,
      cycleEndAt: state?.cycle_end_at ? new Date(state.cycle_end_at) : null,
      reasonCode: 'INVALID_QUOTA_PARAMS',
    };
  }

  let consumedMeters = state?.consumed_m ?? 0;
  let cycleStartAt = state?.cycle_start_at ? new Date(state.cycle_start_at) : null;
  let cycleEndAt = state?.cycle_end_at ? new Date(state.cycle_end_at) : null;

  if (!cycleEndAt || telemetry.timestamp.getTime() > cycleEndAt.getTime()) {
    const window = buildCycleWindow(telemetry.timestamp, cycle);
    cycleStartAt = window.start;
    cycleEndAt = window.end;
    consumedMeters = 0;
    policyQuotaResetTotal.inc({ cycle: cycle === 'monthly' ? 'monthly' : 'daily' });
  }

  if (
    state?.last_lat != null &&
    state?.last_lon != null &&
    state?.last_evaluated_at &&
    telemetry.timestamp.getTime() - new Date(state.last_evaluated_at).getTime() <= MAX_SEGMENT_GAP_MS
  ) {
    consumedMeters += computeDistanceMeters(state.last_lat, state.last_lon, telemetry.lat, telemetry.lon);
  }

  const limitMeters = limitKm * 1000;
  const nearLimit = limitMeters * DEFAULT_NEAR_LIMIT_THRESHOLD;

  if (consumedMeters >= limitMeters) {
    return {
      quotaState: 'EXCEEDED',
      consumedMeters,
      cycleStartAt,
      cycleEndAt,
      reasonCode: 'QUOTA_EXCEEDED',
    };
  }
  if (consumedMeters >= nearLimit) {
    return {
      quotaState: 'NEAR_LIMIT',
      consumedMeters,
      cycleStartAt,
      cycleEndAt,
      reasonCode: 'QUOTA_NEAR_LIMIT',
    };
  }

  return {
    quotaState: 'UNDER_LIMIT',
    consumedMeters,
    cycleStartAt,
    cycleEndAt,
    reasonCode: 'QUOTA_UNDER_LIMIT',
  };
};

const maybeCreateViolation = async (params: {
  policy: VehiclePolicy;
  telemetry: TelemetryContext;
  reasonCode: string;
  trigger: boolean;
  defaultViolationKind: string;
  evidence: Record<string, unknown>;
}): Promise<VehiclePolicyViolation | null> => {
  if (!params.trigger) return null;

  const mode = getPolicyEnforcementMode(params.policy.policy_type);
  if (mode === 'shadow') {
    return null;
  }

  const dedupeKey = `${params.policy.id}:${params.reasonCode}:${params.telemetry.timestamp.toISOString().slice(0, 16)}`;
  const violation = await policyViolationRepo.createPolicyViolation({
    policyId: params.policy.id,
    vehicleId: params.telemetry.vehicleId,
    policyType: params.policy.policy_type,
    violationKind: params.defaultViolationKind,
    severity: getPolicyViolationSeverity(params.policy.policy_type),
    description: `${params.policy.policy_type} policy violation (${params.reasonCode})`,
    locationLat: params.telemetry.lat,
    locationLon: params.telemetry.lon,
    evidence: params.evidence,
    dedupeKey,
    correlationId: randomUUID(),
  });

  if (violation) {
    policyViolationsTotal.inc({
      policy_type: params.policy.policy_type,
      severity: violation.severity,
    });
  }

  return violation;
};

const evaluatePolicy = async (
  policy: VehiclePolicy,
  state: VehiclePolicyState | null,
  telemetry: TelemetryContext,
): Promise<EvaluateResult | null> =>
  withTimer(policy.policy_type, async () => {
  if (policy.policy_type === 'RADIUS') {
    const radius = evaluateRadius(policy, state, telemetry);
    const violation = await maybeCreateViolation({
      policy,
      telemetry,
      reasonCode: radius.reasonCode,
      trigger: radius.spatialState === 'OUTSIDE',
      defaultViolationKind: 'policy_radius_outside',
      evidence: { lat: telemetry.lat, lon: telemetry.lon },
    });

    return {
      policyId: policy.id,
      policyType: policy.policy_type,
      spatialState: radius.spatialState,
      quotaState: state?.quota_state ?? 'UNDER_LIMIT',
      consumedMeters: state?.consumed_m ?? 0,
      reasonCode: radius.reasonCode,
      violation,
    };
  }

  if (policy.policy_type === 'ADMIN_BOUNDARY') {
    const boundary = evaluateAdminBoundary(policy, state, telemetry);
    const violation = await maybeCreateViolation({
      policy,
      telemetry,
      reasonCode: boundary.reasonCode,
      trigger: boundary.spatialState === 'OUTSIDE',
      defaultViolationKind: 'policy_admin_boundary_outside',
      evidence: { lat: telemetry.lat, lon: telemetry.lon },
    });

    return {
      policyId: policy.id,
      policyType: policy.policy_type,
      spatialState: boundary.spatialState,
      quotaState: state?.quota_state ?? 'UNDER_LIMIT',
      consumedMeters: state?.consumed_m ?? 0,
      reasonCode: boundary.reasonCode,
      violation,
    };
  }

  const quota = evaluateDistanceQuota(policy, state, telemetry);
  const violation = await maybeCreateViolation({
    policy,
    telemetry,
    reasonCode: quota.reasonCode,
    trigger: quota.quotaState === 'EXCEEDED',
    defaultViolationKind: 'policy_distance_quota_exceeded',
    evidence: {
      consumedMeters: quota.consumedMeters,
      cycleStartAt: quota.cycleStartAt?.toISOString() ?? null,
      cycleEndAt: quota.cycleEndAt?.toISOString() ?? null,
    },
  });

  const upserted = await policyStateRepo.upsertPolicyState({
    vehicleId: telemetry.vehicleId,
    policyId: policy.id,
    spatialState: state?.spatial_state ?? 'UNKNOWN',
    quotaState: quota.quotaState,
    consumedMeters: quota.consumedMeters,
    cycleStartAt: quota.cycleStartAt,
    cycleEndAt: quota.cycleEndAt,
    lastGoodFixAt: telemetry.timestamp,
    lastEvaluatedAt: telemetry.timestamp,
    lastLat: telemetry.lat,
    lastLon: telemetry.lon,
    lastReasonCode: quota.reasonCode,
    enforceExpectedLastEvaluatedAt: true,
    expectedLastEvaluatedAt: state?.last_evaluated_at ? new Date(state.last_evaluated_at) : null,
  });

  if (!upserted) {
    log.warn('Skipped stale distance quota update', {
      vehicleId: telemetry.vehicleId,
      policyId: policy.id,
      telemetryAt: telemetry.timestamp.toISOString(),
    });
    return null;
  }

  return {
    policyId: policy.id,
    policyType: policy.policy_type,
    spatialState: state?.spatial_state ?? 'UNKNOWN',
    quotaState: quota.quotaState,
    consumedMeters: quota.consumedMeters,
    reasonCode: quota.reasonCode,
    violation,
  };
});

export const evaluateVehiclePolicies = async (telemetry: TelemetryContext): Promise<EvaluateResult[]> => {
  const policies = await vehiclePolicyRepo.listActivePoliciesByVehicle(telemetry.vehicleId);
  if (policies.length === 0) return [];

  const results: EvaluateResult[] = [];

  for (const policy of policies) {
    const state = await policyStateRepo.getPolicyState(telemetry.vehicleId, policy.id);

    if (policy.policy_type !== 'DISTANCE_QUOTA') {
      const evaluated = await evaluatePolicy(policy, state, telemetry);
      if (!evaluated) {
        continue;
      }
      await policyStateRepo.upsertPolicyState({
        vehicleId: telemetry.vehicleId,
        policyId: policy.id,
        spatialState: evaluated.spatialState,
        quotaState: evaluated.quotaState,
        consumedMeters: evaluated.consumedMeters,
        cycleStartAt: state?.cycle_start_at ? new Date(state.cycle_start_at) : null,
        cycleEndAt: state?.cycle_end_at ? new Date(state.cycle_end_at) : null,
        lastGoodFixAt: telemetry.timestamp,
        lastEvaluatedAt: telemetry.timestamp,
        lastLat: telemetry.lat,
        lastLon: telemetry.lon,
        lastReasonCode: evaluated.reasonCode,
      });
      results.push(evaluated);
      continue;
    }

    const evaluated = await evaluatePolicy(policy, state, telemetry);
    if (!evaluated) {
      continue;
    }
    results.push(evaluated);
  }

  if (results.some((item) => item.violation)) {
    log.warn('Policy violation detected', {
      vehicleId: telemetry.vehicleId,
      deviceId: telemetry.deviceId,
      violations: results
        .filter((item) => item.violation)
        .map((item) => ({ policyId: item.policyId, policyType: item.policyType, reasonCode: item.reasonCode })),
    });
  }

  return results;
};
