import { logger } from '../infrastructure/logger';
import { query } from '../infrastructure/database';

/** DB row returned by geofence query */
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

type GeofencePresence = 'inside' | 'outside';

/** Per-device geofence presence: geofenceId → state */
const presenceMap = new Map<string, Map<number, GeofencePresence>>();

/** Per-device consecutive out-of-bounds count for hysteresis */
const exitCountMap = new Map<string, Map<number, number>>();

/** Per-vehicle assigned geofences with TTL */
interface GeofenceCache {
  geofences: GeofenceRow[];
  loadedAt: number;
}

const geofenceAssignmentCache = new Map<string, GeofenceCache>();

const CACHE_TTL_MS = 60_000; // 60 seconds

/**
 * Load geofences assigned to a vehicle from DB, with 60s TTL cache.
 */
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

/** Get current presence state for a device/geofence pair */
export const getPresence = (deviceId: string, geofenceId: number): GeofencePresence => {
  return presenceMap.get(deviceId)?.get(geofenceId) ?? 'outside';
};

/** Set presence state for a device/geofence pair; also resets exit count */
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
    // Reset hysteresis counter when confirmed inside
    exitCountMap.get(deviceId)?.set(geofenceId, 0);
  }
};

/**
 * Increment consecutive out-of-bounds count for hysteresis.
 * Returns the new count so caller can decide whether to fire exit event.
 */
export const incrementExitCount = (deviceId: string, geofenceId: number): number => {
  if (!exitCountMap.has(deviceId)) {
    exitCountMap.set(deviceId, new Map());
  }
  const deviceMap = exitCountMap.get(deviceId)!;
  const count = (deviceMap.get(geofenceId) ?? 0) + 1;
  deviceMap.set(geofenceId, count);
  return count;
};

/** Force-expire vehicle geofence assignment cache (e.g. after reassignment) */
export const invalidateVehicleCache = (vehicleId: string): void => {
  geofenceAssignmentCache.delete(vehicleId);
};
