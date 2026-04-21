import { logger } from '../infrastructure/logger';
import { query } from '../infrastructure/database';

export interface GeofenceRow {
  id: number;
  name: string;
  geofence_type: 'circle' | 'polygon' | 'rectangle';
  center_latitude: number | null;
  center_longitude: number | null;
  radius_meters: number | null;
  coordinates: unknown | null;
  trigger_on: 'enter' | 'exit' | 'both';
}

export type VehicleAllowedZoneMembershipState = 'unknown' | 'inside' | 'outside' | 'suspect';

export interface VehicleAllowedZoneRow {
  id: number;
  vehicle_id: string;
  center_lat: number;
  center_lon: number;
  radius_m: number;
  last_membership_state: VehicleAllowedZoneMembershipState;
  last_membership_changed_at: Date | null;
  last_alerted_state: VehicleAllowedZoneMembershipState | null;
  last_alerted_at: Date | null;
  suppression_until: Date | null;
  alert_mode: 'transition_only' | 'transition_and_recovery' | 'periodic_while_outside' | 'silent';
  cooldown_sec: number;
}

type GeofencePresence = 'inside' | 'outside';

interface GeofenceCache {
  geofences: GeofenceRow[];
  loadedAt: number;
}

interface AllowedZoneCache {
  zone: VehicleAllowedZoneRow | null;
  loadedAt: number;
}

interface UpdateAllowedZoneEvaluationParams {
  zoneId: number;
  vehicleId: string;
  membershipState: VehicleAllowedZoneMembershipState;
  occurredAt: string;
  alertedState?: VehicleAllowedZoneMembershipState;
  alertedAt?: string;
  suppressionUntil: string | null;
  expectedMembershipState: VehicleAllowedZoneMembershipState;
  expectedMembershipChangedAt: string | null;
  expectedAlertedState: VehicleAllowedZoneMembershipState | null;
  expectedAlertedAt: string | null;
  expectedSuppressionUntil: string | null;
}

const presenceMap = new Map<string, Map<number, GeofencePresence>>();
const exitCountMap = new Map<string, Map<number, number>>();
const geofenceAssignmentCache = new Map<string, GeofenceCache>();
const allowedZoneCache = new Map<string, AllowedZoneCache>();
const CACHE_TTL_MS = 15_000;

const ALLOWED_ZONE_SELECT = `SELECT
  id,
  vehicle_id,
  center_lat::double precision AS center_lat,
  center_lon::double precision AS center_lon,
  radius_m::double precision AS radius_m,
  last_membership_state,
  last_membership_changed_at,
  last_alerted_state,
  last_alerted_at,
  suppression_until,
  alert_mode,
  cooldown_sec
 FROM vehicle_allowed_zones`;

export const getAssignedGeofences = async (vehicleId: string): Promise<GeofenceRow[]> => {
  const cached = geofenceAssignmentCache.get(vehicleId);
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
    return cached.geofences;
  }

  try {
    const result = await query<GeofenceRow>(
      `SELECT g.id, g.name, g.geofence_type,
              g.center_latitude, g.center_longitude, g.radius_meters,
              g.coordinates, g.trigger_on
       FROM geofences g
       JOIN geofence_vehicles gv ON g.id = gv.geofence_id
       WHERE gv.vehicle_id = $1 AND g.is_active = true`,
      [vehicleId],
    );

    const geofences = result.rows;
    geofenceAssignmentCache.set(vehicleId, { geofences, loadedAt: Date.now() });
    return geofences;
  } catch (err) {
    logger.error({ err, vehicleId }, 'Failed to load assigned geofences');
    return cached?.geofences ?? [];
  }
};

export const getActiveAllowedZone = async (
  vehicleId: string,
): Promise<VehicleAllowedZoneRow | null> => {
  const cached = allowedZoneCache.get(vehicleId);
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
    return cached.zone;
  }

  try {
    const result = await query<VehicleAllowedZoneRow>(
      `${ALLOWED_ZONE_SELECT}
       WHERE vehicle_id = $1 AND status = 'active'
       LIMIT 1`,
      [vehicleId],
    );

    const zone = result.rows[0] ?? null;
    allowedZoneCache.set(vehicleId, { zone, loadedAt: Date.now() });
    return zone;
  } catch (err) {
    logger.error({ err, vehicleId }, 'Failed to load active allowed zone');
    return cached?.zone ?? null;
  }
};

export const updateAllowedZoneEvaluation = async (
  params: UpdateAllowedZoneEvaluationParams,
): Promise<VehicleAllowedZoneRow | null> => {
  try {
    const result = await query<VehicleAllowedZoneRow>(
      `UPDATE vehicle_allowed_zones
       SET last_membership_state = $2,
           last_membership_changed_at = CASE
             WHEN last_membership_state IS DISTINCT FROM $2 THEN $3::timestamptz
             ELSE last_membership_changed_at
           END,
           last_alerted_state = CASE
             WHEN $4::text IS NULL THEN last_alerted_state
             ELSE $4::varchar(16)
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
         AND last_membership_state = $8
         AND last_membership_changed_at IS NOT DISTINCT FROM $9::timestamptz
         AND last_alerted_state IS NOT DISTINCT FROM $10::varchar(16)
         AND last_alerted_at IS NOT DISTINCT FROM $11::timestamptz
         AND suppression_until IS NOT DISTINCT FROM $12::timestamptz
         AND $3::timestamptz >= COALESCE(last_membership_changed_at, '-infinity'::timestamptz)
         AND $3::timestamptz >= COALESCE(last_alerted_at, '-infinity'::timestamptz)
       RETURNING id,
                 vehicle_id,
                 center_lat::double precision AS center_lat,
                 center_lon::double precision AS center_lon,
                 radius_m::double precision AS radius_m,
                 last_membership_state,
                 last_membership_changed_at,
                 last_alerted_state,
                 last_alerted_at,
                 suppression_until,
                 alert_mode,
                 cooldown_sec`,
      [
        params.zoneId,
        params.membershipState,
        params.occurredAt,
        params.alertedState ?? null,
        params.alertedAt ?? null,
        params.suppressionUntil,
        params.vehicleId,
        params.expectedMembershipState,
        params.expectedMembershipChangedAt,
        params.expectedAlertedState,
        params.expectedAlertedAt,
        params.expectedSuppressionUntil,
      ],
    );

    const zone = result.rows[0] ?? null;
    if (!zone) {
      allowedZoneCache.delete(params.vehicleId);
      return null;
    }

    allowedZoneCache.set(params.vehicleId, { zone, loadedAt: Date.now() });
    return zone;
  } catch (err) {
    logger.error({ err, zoneId: params.zoneId }, 'Failed to update allowed zone evaluation');
    allowedZoneCache.delete(params.vehicleId);
    return null;
  }
};

export const getPresence = (deviceId: string, geofenceId: number): GeofencePresence => {
  return presenceMap.get(deviceId)?.get(geofenceId) ?? 'outside';
};

export const setPresence = (
  deviceId: string,
  geofenceId: number,
  state: GeofencePresence,
): void => {
  if (!presenceMap.has(deviceId)) {
    presenceMap.set(deviceId, new Map());
  }
  presenceMap.get(deviceId)!.set(geofenceId, state);

  if (state === 'inside') {
    exitCountMap.get(deviceId)?.set(geofenceId, 0);
  }
};

export const incrementExitCount = (deviceId: string, geofenceId: number): number => {
  if (!exitCountMap.has(deviceId)) {
    exitCountMap.set(deviceId, new Map());
  }
  const deviceMap = exitCountMap.get(deviceId)!;
  const count = (deviceMap.get(geofenceId) ?? 0) + 1;
  deviceMap.set(geofenceId, count);
  return count;
};

export const invalidateVehicleCache = (vehicleId: string): void => {
  geofenceAssignmentCache.delete(vehicleId);
  allowedZoneCache.delete(vehicleId);
};
