import { logger } from '../infrastructure/logger';
import { query } from '../infrastructure/database';

export type VehicleZoneMembershipState = 'unknown' | 'inside' | 'outside' | 'suspect';
export type VehicleZoneAlertType = 'zone_enter' | 'zone_exit' | 'zone_outside_periodic';

export interface VehicleZoneRow {
  id: number;
  vehicle_id: string;
  zone_type: 'circle' | 'administrative_boundary';
  center_lat: number | null;
  center_lon: number | null;
  radius_m: number | null;
  geometry_json: unknown | null;
  membership_state: VehicleZoneMembershipState;
  last_membership_changed_at: Date | null;
  last_alerted_type: VehicleZoneAlertType | null;
  last_alerted_at: Date | null;
  suppression_until: Date | null;
  alert_mode: 'transition_only' | 'transition_and_recovery' | 'periodic_while_outside' | 'silent';
  cooldown_sec: number;
}

interface VehicleZoneCache {
  zone: VehicleZoneRow | null;
  loadedAt: number;
}

interface UpdateVehicleZoneEvaluationParams {
  zoneId: number;
  vehicleId: string;
  membershipState: VehicleZoneMembershipState;
  occurredAt: string;
  alertedType?: VehicleZoneAlertType;
  alertedAt?: string;
  suppressionUntil: string | null;
  expectedMembershipState: VehicleZoneMembershipState;
  expectedMembershipChangedAt: string | null;
  expectedAlertedType: VehicleZoneAlertType | null;
  expectedAlertedAt: string | null;
  expectedSuppressionUntil: string | null;
}

const zoneCache = new Map<string, VehicleZoneCache>();
const CACHE_TTL_MS = 15_000;

const VEHICLE_ZONE_SELECT = `SELECT
  id,
  vehicle_id,
  zone_type,
  center_lat::double precision AS center_lat,
  center_lon::double precision AS center_lon,
  radius_m::double precision AS radius_m,
  geometry_json,
  membership_state,
  last_membership_changed_at,
  last_alerted_type,
  last_alerted_at,
  suppression_until,
  alert_mode,
  cooldown_sec
 FROM vehicle_zones`;

export const getActiveZone = async (vehicleId: string): Promise<VehicleZoneRow | null> => {
  const cached = zoneCache.get(vehicleId);
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
    return cached.zone;
  }

  try {
    const result = await query<VehicleZoneRow>(
      `${VEHICLE_ZONE_SELECT}
       WHERE vehicle_id = $1 AND status = 'active'
       LIMIT 1`,
      [vehicleId],
    );

    const zone = result.rows[0] ?? null;
    zoneCache.set(vehicleId, { zone, loadedAt: Date.now() });
    return zone;
  } catch (err) {
    logger.error({ err, vehicleId }, 'Failed to load active vehicle zone');
    return cached?.zone ?? null;
  }
};

export const updateZoneEvaluation = async (
  params: UpdateVehicleZoneEvaluationParams,
): Promise<VehicleZoneRow | null> => {
  try {
    const result = await query<VehicleZoneRow>(
      `UPDATE vehicle_zones
       SET membership_state = $2,
           last_membership_changed_at = CASE
             WHEN membership_state IS DISTINCT FROM $2 THEN $3::timestamptz
             ELSE last_membership_changed_at
           END,
           last_alerted_type = CASE
             WHEN $4::text IS NULL THEN last_alerted_type
             ELSE $4::varchar(32)
           END,
           last_alerted_at = CASE
             WHEN $5::timestamptz IS NULL THEN last_alerted_at
             ELSE $5::timestamptz
           END,
           suppression_until = $6::timestamptz,
           updated_at = NOW()
       WHERE id = $1
         AND vehicle_id = $7
         AND status = 'active'
         AND membership_state = $8
         AND last_membership_changed_at IS NOT DISTINCT FROM $9::timestamptz
         AND last_alerted_type IS NOT DISTINCT FROM $10::varchar(32)
         AND last_alerted_at IS NOT DISTINCT FROM $11::timestamptz
         AND suppression_until IS NOT DISTINCT FROM $12::timestamptz
         AND $3::timestamptz >= COALESCE(last_membership_changed_at, '-infinity'::timestamptz)
         AND $3::timestamptz >= COALESCE(last_alerted_at, '-infinity'::timestamptz)
       RETURNING id,
                 vehicle_id,
                 zone_type,
                 center_lat::double precision AS center_lat,
                 center_lon::double precision AS center_lon,
                 radius_m::double precision AS radius_m,
                 geometry_json,
                 membership_state,
                 last_membership_changed_at,
                 last_alerted_type,
                 last_alerted_at,
                 suppression_until,
                 alert_mode,
                 cooldown_sec`,
      [
        params.zoneId,
        params.membershipState,
        params.occurredAt,
        params.alertedType ?? null,
        params.alertedAt ?? null,
        params.suppressionUntil,
        params.vehicleId,
        params.expectedMembershipState,
        params.expectedMembershipChangedAt,
        params.expectedAlertedType,
        params.expectedAlertedAt,
        params.expectedSuppressionUntil,
      ],
    );

    const zone = result.rows[0] ?? null;
    if (!zone) {
      zoneCache.delete(params.vehicleId);
      return null;
    }

    zoneCache.set(params.vehicleId, { zone, loadedAt: Date.now() });
    return zone;
  } catch (err) {
    logger.error({ err, zoneId: params.zoneId }, 'Failed to update vehicle zone evaluation');
    zoneCache.delete(params.vehicleId);
    return null;
  }
};

export const invalidateVehicleCache = (vehicleId: string): void => {
  zoneCache.delete(vehicleId);
};
