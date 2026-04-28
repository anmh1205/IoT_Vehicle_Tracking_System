import { logger } from '../infrastructure/logger';
import { publishInternalEvent } from '../publishers/internal-event.publisher';
import {
  getActiveZone,
  updateZoneEvaluation,
  type VehicleZoneAlertType,
  type VehicleZoneMembershipState,
  type VehicleZoneRow,
} from '../cache/geofence-state.cache';

const EDGE_TOLERANCE_M = 25;
const COORD_EPSILON = 1e-9;

const haversineMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const earthRadiusM = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return earthRadiusM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const parseGeometry = (value: unknown): Record<string, unknown> | null => {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return parseGeometry(JSON.parse(value));
    } catch {
      return null;
    }
  }
  return typeof value === 'object' ? (value as Record<string, unknown>) : null;
};

const pointOnSegment = (point: [number, number], start: [number, number], end: [number, number]) => {
  const [x, y] = point;
  const [x1, y1] = start;
  const [x2, y2] = end;
  const cross = (x - x1) * (y2 - y1) - (y - y1) * (x2 - x1);
  if (Math.abs(cross) > COORD_EPSILON) return false;

  return (
    x >= Math.min(x1, x2) - COORD_EPSILON &&
    x <= Math.max(x1, x2) + COORD_EPSILON &&
    y >= Math.min(y1, y2) - COORD_EPSILON &&
    y <= Math.max(y1, y2) + COORD_EPSILON
  );
};

const pointInRing = (point: [number, number], ring: [number, number][]) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > point[1] !== yj > point[1] &&
      point[0] < ((xj - xi) * (point[1] - yi)) / ((yj - yi) || Number.EPSILON) + xi;

    if (intersect) {
      inside = !inside;
    }
  }
  return inside;
};

const polygonContains = (point: [number, number], polygon: [number, number][][]) => {
  if (polygon.length === 0 || !pointInRing(point, polygon[0])) {
    return false;
  }

  return !polygon.slice(1).some((hole) => pointInRing(point, hole));
};

const polygonBoundary = (point: [number, number], polygon: [number, number][][]) =>
  polygon.some((ring) => ring.some((_, index) => pointOnSegment(point, ring[index], ring[(index + 1) % ring.length])));

const resolveBoundaryMembership = (
  lat: number,
  lon: number,
  geometryValue: unknown,
): VehicleZoneMembershipState => {
  const geometry = parseGeometry(geometryValue);
  const point: [number, number] = [lon, lat];
  if (!geometry?.type) return 'unknown';

  const type = String(geometry.type);
  const coordinates = geometry.coordinates;
  const polygons =
    type === 'Polygon'
      ? [coordinates as [number, number][][]]
      : type === 'MultiPolygon'
        ? (coordinates as [number, number][][][])
        : [];

  if (polygons.length === 0) return 'unknown';
  if (polygons.some((polygon) => polygonBoundary(point, polygon))) return 'outside';
  return polygons.some((polygon) => polygonContains(point, polygon)) ? 'inside' : 'outside';
};

const resolveZoneMembership = (
  lat: number,
  lon: number,
  zone: VehicleZoneRow,
): VehicleZoneMembershipState => {
  if (zone.zone_type === 'circle') {
    if (zone.center_lat == null || zone.center_lon == null || zone.radius_m == null) {
      return 'unknown';
    }

    const distance = haversineMeters(lat, lon, zone.center_lat, zone.center_lon);
    if (distance <= Math.max(0, zone.radius_m - EDGE_TOLERANCE_M)) return 'inside';
    if (distance >= zone.radius_m + EDGE_TOLERANCE_M) return 'outside';
    return 'suspect';
  }

  return resolveBoundaryMembership(lat, lon, zone.geometry_json);
};

const shouldEmitZoneAlert = (
  zone: VehicleZoneRow,
  previousState: VehicleZoneMembershipState,
  nextState: VehicleZoneMembershipState,
  occurredAtMs: number,
): VehicleZoneAlertType | null => {
  if (zone.alert_mode === 'silent' || nextState === 'suspect' || nextState === 'unknown') {
    return null;
  }

  if (zone.suppression_until && zone.suppression_until.getTime() > occurredAtMs) {
    return null;
  }

  if (nextState === 'outside') {
    if (previousState === 'inside') return 'zone_exit';
    if (zone.alert_mode === 'periodic_while_outside' && previousState === 'outside') {
      return 'zone_outside_periodic';
    }
    return null;
  }

  if (nextState === 'inside' && previousState === 'outside' && zone.alert_mode === 'transition_and_recovery') {
    return 'zone_enter';
  }

  return null;
};

const toIsoOrNull = (value: Date | null): string | null => value?.toISOString() ?? null;

export const checkGeofences = async (
  deviceId: string,
  vehicleId: string,
  lat: number,
  lon: number,
  occurredAt: string,
): Promise<void> => {
  const zone = await getActiveZone(vehicleId);
  if (!zone) {
    return;
  }

  const occurredAtMs = Date.parse(occurredAt);
  if (!Number.isFinite(occurredAtMs)) {
    logger.warn({ deviceId, vehicleId, occurredAt }, 'Skipping vehicle zone evaluation for invalid timestamp');
    return;
  }

  const newestKnownAt = Math.max(
    zone.last_membership_changed_at?.getTime() ?? Number.NEGATIVE_INFINITY,
    zone.last_alerted_at?.getTime() ?? Number.NEGATIVE_INFINITY,
  );
  if (occurredAtMs < newestKnownAt) {
    logger.debug({ deviceId, vehicleId, zoneId: zone.id, occurredAt }, 'Skipping stale vehicle zone sample');
    return;
  }

  const previousState = zone.membership_state;
  const nextState = resolveZoneMembership(lat, lon, zone);
  const alertType = shouldEmitZoneAlert(zone, previousState, nextState, occurredAtMs);
  const suppressionUntil = alertType
    ? new Date(occurredAtMs + zone.cooldown_sec * 1000).toISOString()
    : zone.suppression_until?.toISOString() ?? null;

  const updatedZone = await updateZoneEvaluation({
    zoneId: zone.id,
    vehicleId,
    membershipState: nextState,
    occurredAt,
    alertedType: alertType ?? undefined,
    alertedAt: alertType ? occurredAt : undefined,
    suppressionUntil,
    expectedMembershipState: zone.membership_state,
    expectedMembershipChangedAt: toIsoOrNull(zone.last_membership_changed_at),
    expectedAlertedType: zone.last_alerted_type,
    expectedAlertedAt: toIsoOrNull(zone.last_alerted_at),
    expectedSuppressionUntil: toIsoOrNull(zone.suppression_until),
  });

  if (!updatedZone) {
    logger.debug({ deviceId, vehicleId, zoneId: zone.id, occurredAt }, 'Dropped vehicle zone update after race/loss');
    return;
  }

  if (previousState !== updatedZone.membership_state) {
    publishInternalEvent('zone', {
      event_name: 'state_changed',
      device_id: deviceId,
      vehicle_id: vehicleId,
      zone_id: updatedZone.id,
      previous_membership_state: previousState,
      membership_state: updatedZone.membership_state,
      last_changed_at: updatedZone.last_membership_changed_at?.toISOString() ?? occurredAt,
      latitude: lat,
      longitude: lon,
    });
  }

  if (!alertType || updatedZone.last_alerted_at?.toISOString() !== occurredAt) {
    return;
  }

  const titles: Record<VehicleZoneAlertType, string> = {
    zone_enter: 'Vehicle returned to zone',
    zone_exit: 'Vehicle exited zone',
    zone_outside_periodic: 'Vehicle remains outside zone',
  };
  const messages: Record<VehicleZoneAlertType, string> = {
    zone_enter: `Vehicle ${vehicleId} moved back inside its configured zone at ${lat},${lon}`,
    zone_exit: `Vehicle ${vehicleId} moved outside its configured zone at ${lat},${lon}`,
    zone_outside_periodic: `Vehicle ${vehicleId} is still outside its configured zone at ${lat},${lon}`,
  };

  publishInternalEvent('alert', {
    device_id: deviceId,
    vehicle_id: vehicleId,
    alert_type: alertType,
    severity: 'medium',
    title: titles[alertType],
    message: messages[alertType],
    latitude: lat,
    longitude: lon,
    metadata: {
      zone_id: updatedZone.id,
      zone_type: updatedZone.zone_type,
      previous_membership_state: previousState,
      membership_state: updatedZone.membership_state,
      radius_m: updatedZone.radius_m,
    },
  });

  logger.info(
    { deviceId, vehicleId, zoneId: updatedZone.id, alertType, previousState, nextState: updatedZone.membership_state },
    'Vehicle zone alert emitted',
  );
};
