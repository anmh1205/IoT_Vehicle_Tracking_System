import { logger } from '../infrastructure/logger';
import { publishInternalEvent } from '../publishers/internal-event.publisher';
import {
  getAssignedGeofences,
  getPresence,
  setPresence,
  incrementExitCount,
  type GeofenceRow,
} from '../cache/geofence-state.cache';

/**
 * Haversine distance between two GPS points, in meters.
 */
const haversineMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6_371_000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Ray-casting point-in-polygon.
 * polygon: array of [latitude, longitude] pairs.
 */
const pointInPolygon = (lat: number, lon: number, polygon: [number, number][]): boolean => {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [yi, xi] = polygon[i];
    const [yj, xj] = polygon[j];
    if ((yi > lon) !== (yj > lon) && lat < ((xj - xi) * (lon - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
};

/** Check whether a GPS point is inside a single geofence row */
const isInsideGeofence = (lat: number, lon: number, geofence: GeofenceRow): boolean => {
  const type = geofence.geofence_type;

  if (type === 'circle') {
    if (
      geofence.center_latitude === null ||
      geofence.center_longitude === null ||
      geofence.radius_meters === null
    ) {
      return false;
    }
    const dist = haversineMeters(
      lat,
      lon,
      geofence.center_latitude,
      geofence.center_longitude,
    );
    return dist <= geofence.radius_meters;
  }

  if (type === 'polygon' || type === 'rectangle') {
    if (!geofence.coordinates) return false;
    let polygon: [number, number][];
    try {
      polygon = Array.isArray(geofence.coordinates)
        ? (geofence.coordinates as [number, number][])
        : (JSON.parse(geofence.coordinates as string) as [number, number][]);
    } catch {
      return false;
    }
    return pointInPolygon(lat, lon, polygon);
  }

  return false;
};

/** Number of consecutive out-of-bounds readings required before firing exit event */
const EXIT_HYSTERESIS_COUNT = 2;

/**
 * Main geofence check called for every GPS update.
 * Fires 'alert' internal events on enter/exit state transitions.
 * Respects trigger_on field ('enter' | 'exit' | 'both').
 */
export const checkGeofences = async (
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
      // Point is inside geofence
      if (previousState === 'outside') {
        // State transition: outside → inside (ENTER event)
        setPresence(deviceId, geofence.id, 'inside');

        if (geofence.trigger_on === 'enter' || geofence.trigger_on === 'both') {
          publishInternalEvent('alert', {
            device_id: deviceId,
            vehicle_id: vehicleId,
            alert_type: 'geofence_enter',
            severity: 'medium',
            title: `Vehicle entered geofence: ${geofence.name}`,
            description: `Vehicle ${vehicleId} entered geofence "${geofence.name}" at ${lat},${lon}`,
            metadata: { geofence_id: geofence.id, latitude: lat, longitude: lon },
          });
          logger.info(
            `GEOFENCE ENTER: device=${deviceId} vehicle=${vehicleId} geofence="${geofence.name}"`,
          );
        }
      } else {
        // Still inside — reset exit hysteresis
        setPresence(deviceId, geofence.id, 'inside');
      }
    } else {
      // Point is outside geofence
      if (previousState === 'inside') {
        // Possible exit — apply hysteresis to handle GPS jitter
        const exitCount = incrementExitCount(deviceId, geofence.id);

        if (exitCount >= EXIT_HYSTERESIS_COUNT) {
          // Confirmed exit after consecutive out-of-bounds readings
          setPresence(deviceId, geofence.id, 'outside');

          if (geofence.trigger_on === 'exit' || geofence.trigger_on === 'both') {
            publishInternalEvent('alert', {
              device_id: deviceId,
              vehicle_id: vehicleId,
              alert_type: 'geofence_exit',
              severity: 'medium',
              title: `Vehicle exited geofence: ${geofence.name}`,
              description: `Vehicle ${vehicleId} exited geofence "${geofence.name}" at ${lat},${lon}`,
              metadata: { geofence_id: geofence.id, latitude: lat, longitude: lon },
            });
            logger.info(
              `GEOFENCE EXIT: device=${deviceId} vehicle=${vehicleId} geofence="${geofence.name}"`,
            );
          }
        }
      }
      // else: already outside, no state change
    }
  }
};
