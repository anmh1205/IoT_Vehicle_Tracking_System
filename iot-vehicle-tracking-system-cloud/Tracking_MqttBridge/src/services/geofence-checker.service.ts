import { logger } from '../infrastructure/logger';
import { publishInternalEvent } from '../publishers/internal-event.publisher';
import {
  getActiveAllowedZone,
  getAssignedGeofences,
  getPresence,
  incrementExitCount,
  setPresence,
  updateAllowedZoneEvaluation,
  type GeofenceRow,
  type VehicleAllowedZoneMembershipState,
  type VehicleAllowedZoneRow,
} from '../cache/geofence-state.cache';

const EXIT_HYSTERESIS_COUNT = 2;
const ALLOWED_ZONE_EDGE_TOLERANCE_M = 25;

const haversineMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const earthRadiusM = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return earthRadiusM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const pointInPolygon = (lat: number, lon: number, polygon: [number, number][]): boolean => {
  let inside = false;
  const size = polygon.length;
  for (let i = 0, j = size - 1; i < size; j = i++) {
    const [yi, xi] = polygon[i];
    const [yj, xj] = polygon[j];
    if ((yi > lon) !== (yj > lon) && lat < ((xj - xi) * (lon - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
};

const isInsideGeofence = (lat: number, lon: number, geofence: GeofenceRow): boolean => {
  if (geofence.geofence_type === 'circle') {
    if (
      geofence.center_latitude === null ||
      geofence.center_longitude === null ||
      geofence.radius_meters === null
    ) {
      return false;
    }

    const distance = haversineMeters(
      lat,
      lon,
      geofence.center_latitude,
      geofence.center_longitude,
    );
    return distance <= geofence.radius_meters;
  }

  if (geofence.geofence_type === 'polygon' || geofence.geofence_type === 'rectangle') {
    if (!geofence.coordinates) return false;

    try {
      const polygon = Array.isArray(geofence.coordinates)
        ? (geofence.coordinates as [number, number][])
        : (JSON.parse(geofence.coordinates as string) as [number, number][]);
      return pointInPolygon(lat, lon, polygon);
    } catch {
      return false;
    }
  }

  return false;
};

const resolveAllowedZoneMembership = (
  lat: number,
  lon: number,
  zone: VehicleAllowedZoneRow,
): VehicleAllowedZoneMembershipState => {
  const distance = haversineMeters(lat, lon, zone.center_lat, zone.center_lon);
  if (distance <= Math.max(0, zone.radius_m - ALLOWED_ZONE_EDGE_TOLERANCE_M)) {
    return 'inside';
  }
  if (distance >= zone.radius_m + ALLOWED_ZONE_EDGE_TOLERANCE_M) {
    return 'outside';
  }
  return 'suspect';
};

const shouldEmitAllowedZoneAlert = (
  zone: VehicleAllowedZoneRow,
  previousState: VehicleAllowedZoneMembershipState,
  nextState: VehicleAllowedZoneMembershipState,
  occurredAtMs: number,
): 'geofence_enter' | 'geofence_exit' | null => {
  if (zone.alert_mode === 'silent' || nextState === 'suspect' || nextState === 'unknown') {
    return null;
  }

  const isSuppressed =
    zone.suppression_until !== null && zone.suppression_until.getTime() > occurredAtMs;
  if (isSuppressed) {
    return null;
  }

  if (nextState === 'outside') {
    if (previousState === 'inside') {
      return 'geofence_exit';
    }
    if (zone.alert_mode === 'periodic_while_outside' && previousState === 'outside') {
      return 'geofence_exit';
    }
    return null;
  }

  if (
    nextState === 'inside' &&
    previousState === 'outside' &&
    zone.alert_mode === 'transition_and_recovery'
  ) {
    return 'geofence_enter';
  }

  return null;
};

const publishAllowedZoneStateChanged = (params: {
  deviceId: string;
  vehicleId: string;
  zoneId: number;
  previousState: VehicleAllowedZoneMembershipState;
  membershipState: VehicleAllowedZoneMembershipState;
  occurredAt: string;
  latitude: number;
  longitude: number;
}): void => {
  publishInternalEvent('geofence', {
    event_name: 'allowed_zone_state_changed',
    device_id: params.deviceId,
    vehicle_id: params.vehicleId,
    allowed_zone_id: params.zoneId,
    previous_membership_state: params.previousState,
    membership_state: params.membershipState,
    last_changed_at: params.occurredAt,
    latitude: params.latitude,
    longitude: params.longitude,
  });
};

const toIsoOrNull = (value: Date | null): string | null => value?.toISOString() ?? null;

const evaluateAllowedZone = async (
  deviceId: string,
  vehicleId: string,
  lat: number,
  lon: number,
  occurredAt: string,
): Promise<boolean> => {
  const zone = await getActiveAllowedZone(vehicleId);
  if (!zone) {
    return false;
  }

  const occurredAtMs = Date.parse(occurredAt);
  if (!Number.isFinite(occurredAtMs)) {
    logger.warn({ deviceId, vehicleId, occurredAt }, 'Skipping allowed-zone evaluation for invalid timestamp');
    return true;
  }

  const newestKnownAt = Math.max(
    zone.last_membership_changed_at?.getTime() ?? Number.NEGATIVE_INFINITY,
    zone.last_alerted_at?.getTime() ?? Number.NEGATIVE_INFINITY,
  );
  if (occurredAtMs < newestKnownAt) {
    logger.debug(
      { deviceId, vehicleId, allowedZoneId: zone.id, occurredAt, newestKnownAt },
      'Skipping stale allowed-zone telemetry sample',
    );
    return true;
  }

  const previousState = zone.last_membership_state;
  const nextState = resolveAllowedZoneMembership(lat, lon, zone);
  const alertType = shouldEmitAllowedZoneAlert(zone, previousState, nextState, occurredAtMs);
  const suppressionUntil = alertType
    ? new Date(occurredAtMs + zone.cooldown_sec * 1000).toISOString()
    : zone.suppression_until?.toISOString() ?? null;

  const updatedZone = await updateAllowedZoneEvaluation({
    zoneId: zone.id,
    vehicleId,
    membershipState: nextState,
    occurredAt,
    alertedState: alertType ? nextState : undefined,
    alertedAt: alertType ? occurredAt : undefined,
    suppressionUntil,
    expectedMembershipState: zone.last_membership_state,
    expectedMembershipChangedAt: toIsoOrNull(zone.last_membership_changed_at),
    expectedAlertedState: zone.last_alerted_state,
    expectedAlertedAt: toIsoOrNull(zone.last_alerted_at),
    expectedSuppressionUntil: toIsoOrNull(zone.suppression_until),
  });

  if (!updatedZone) {
    logger.debug(
      { deviceId, vehicleId, allowedZoneId: zone.id, occurredAt },
      'Dropped allowed-zone side effects because state update lost race or failed',
    );
    return true;
  }

  if (previousState !== updatedZone.last_membership_state) {
    publishAllowedZoneStateChanged({
      deviceId,
      vehicleId,
      zoneId: updatedZone.id,
      previousState,
      membershipState: updatedZone.last_membership_state,
      occurredAt: updatedZone.last_membership_changed_at?.toISOString() ?? occurredAt,
      latitude: lat,
      longitude: lon,
    });
  }

  if (!alertType || updatedZone.last_alerted_at?.toISOString() !== occurredAt) {
    return true;
  }

  const title =
    alertType === 'geofence_exit' ? 'Vehicle exited allowed zone' : 'Vehicle returned to allowed zone';
  const message =
    alertType === 'geofence_exit'
      ? `Vehicle ${vehicleId} moved outside its configured allowed zone at ${lat},${lon}`
      : `Vehicle ${vehicleId} moved back inside its configured allowed zone at ${lat},${lon}`;

  publishInternalEvent('alert', {
    device_id: deviceId,
    vehicle_id: vehicleId,
    alert_type: alertType,
    severity: 'medium',
    title,
    message,
    latitude: lat,
    longitude: lon,
    metadata: {
      allowed_zone_id: updatedZone.id,
      previous_membership_state: previousState,
      membership_state: updatedZone.last_membership_state,
      radius_m: updatedZone.radius_m,
    },
  });

  logger.info(
    {
      deviceId,
      vehicleId,
      allowedZoneId: updatedZone.id,
      alertType,
      previousState,
      nextState: updatedZone.last_membership_state,
    },
    'Allowed zone alert emitted',
  );

  return true;
};

const checkLegacyGeofences = async (
  deviceId: string,
  vehicleId: string,
  lat: number,
  lon: number,
): Promise<void> => {
  const geofences = await getAssignedGeofences(vehicleId);
  if (geofences.length === 0) return;

  for (const geofence of geofences) {
    const currentlyInside = isInsideGeofence(lat, lon, geofence);
    const previousState = getPresence(deviceId, geofence.id);

    if (currentlyInside) {
      if (previousState === 'outside') {
        setPresence(deviceId, geofence.id, 'inside');
        if (geofence.trigger_on === 'enter' || geofence.trigger_on === 'both') {
          publishInternalEvent('alert', {
            device_id: deviceId,
            vehicle_id: vehicleId,
            alert_type: 'geofence_enter',
            severity: 'medium',
            title: `Vehicle entered geofence: ${geofence.name}`,
            message: `Vehicle ${vehicleId} entered geofence "${geofence.name}" at ${lat},${lon}`,
            metadata: { geofence_id: geofence.id, latitude: lat, longitude: lon },
          });
        }
      } else {
        setPresence(deviceId, geofence.id, 'inside');
      }
      continue;
    }

    if (previousState !== 'inside') {
      continue;
    }

    const exitCount = incrementExitCount(deviceId, geofence.id);
    if (exitCount < EXIT_HYSTERESIS_COUNT) {
      continue;
    }

    setPresence(deviceId, geofence.id, 'outside');
    if (geofence.trigger_on === 'exit' || geofence.trigger_on === 'both') {
      publishInternalEvent('alert', {
        device_id: deviceId,
        vehicle_id: vehicleId,
        alert_type: 'geofence_exit',
        severity: 'medium',
        title: `Vehicle exited geofence: ${geofence.name}`,
        message: `Vehicle ${vehicleId} exited geofence "${geofence.name}" at ${lat},${lon}`,
        metadata: { geofence_id: geofence.id, latitude: lat, longitude: lon },
      });
    }
  }
};

export const checkGeofences = async (
  deviceId: string,
  vehicleId: string,
  lat: number,
  lon: number,
  occurredAt: string,
): Promise<void> => {
  const handledByAllowedZone = await evaluateAllowedZone(deviceId, vehicleId, lat, lon, occurredAt);
  if (handledByAllowedZone) {
    return;
  }

  await checkLegacyGeofences(deviceId, vehicleId, lat, lon);
};
