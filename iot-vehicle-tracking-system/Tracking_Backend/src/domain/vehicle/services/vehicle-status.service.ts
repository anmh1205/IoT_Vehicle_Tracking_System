import { pool } from '@/infrastructure/database/pool';
import { findOne, findMany } from '@/infrastructure/database/queries';
import { createNotFoundError } from '@/shared/utils/errors.util';
import type { Vehicle } from '@/domain/vehicle/types/vehicle.types';

/** Real-time device row from devices table */
interface DeviceRow {
  device_id: string;
  status: string;
  last_seen_at: Date | null;
  battery_level: number | null;
}

/** Active trip row */
interface TripRow {
  id: number;
  status: string;
  actual_start: Date | null;
  distance_km: number | null;
}

/** Recent active alert row */
interface AlertRow {
  id: number;
  alert_type: string;
  severity: string;
}

/** Latest telemetry position row from device_sessions or telemetry table */
interface TelemetryRow {
  latitude: number | null;
  longitude: number | null;
  speed: number | null;
  course: number | null;
  recorded_at: Date | null;
}

export interface VehicleStatusPublic {
  vehicleId: string;
  status: string;
  currentLocation: {
    lat: number;
    lon: number;
    speed: number;
    course: number;
    timestamp: string;
  } | null;
  device: {
    status: string;
    lastSeen: string;
    batteryLevel: number | null;
  } | null;
  currentTrip: {
    id: number;
    status: string;
    startTime: string;
    distanceKm: number;
  } | null;
  activeAlerts: Array<{ id: number; alertType: string; severity: string }>;
}

/**
 * Aggregate real-time status for a vehicle:
 * vehicle info + device status + active trip + recent active alerts.
 */
export const getVehicleStatus = async (id: number): Promise<VehicleStatusPublic> => {
  // 1. Vehicle info
  const vehicle = await findOne<Vehicle>('SELECT * FROM vehicles WHERE id = $1', [id]);
  if (!vehicle) {
    throw createNotFoundError(`Vehicle with ID ${id} not found`);
  }

  // 2. Device last status (if device assigned)
  let deviceInfo: VehicleStatusPublic['device'] = null;
  let currentLocation: VehicleStatusPublic['currentLocation'] = null;

  if (vehicle.device_id) {
    const device = await findOne<DeviceRow>(
      `SELECT device_id, status, last_seen_at, battery_level FROM devices WHERE device_id = $1`,
      [vehicle.device_id],
    );

    if (device) {
      deviceInfo = {
        status: device.status,
        lastSeen: device.last_seen_at?.toISOString() ?? new Date(0).toISOString(),
        batteryLevel: device.battery_level,
      };
    }

    // 3. Latest telemetry position from device_data_logs or event_logs
    const telemetry = await findOne<TelemetryRow>(
      `SELECT latitude, longitude, speed, course, recorded_at
       FROM event_logs
       WHERE device_id = $1 AND latitude IS NOT NULL AND longitude IS NOT NULL
       ORDER BY recorded_at DESC LIMIT 1`,
      [vehicle.device_id],
    );

    if (telemetry?.latitude != null && telemetry?.longitude != null) {
      currentLocation = {
        lat: telemetry.latitude,
        lon: telemetry.longitude,
        speed: telemetry.speed ?? 0,
        course: telemetry.course ?? 0,
        timestamp: telemetry.recorded_at?.toISOString() ?? new Date().toISOString(),
      };
    }
  }

  // 4. Active trip (in_progress) for this vehicle
  const activeTrip = await findOne<TripRow>(
    `SELECT id, status, actual_start, distance_km FROM trips
     WHERE vehicle_id = $1 AND status = 'in_progress'
     ORDER BY actual_start DESC LIMIT 1`,
    [vehicle.vehicle_id],
  );

  const currentTrip: VehicleStatusPublic['currentTrip'] = activeTrip
    ? {
        id: activeTrip.id,
        status: activeTrip.status,
        startTime: activeTrip.actual_start?.toISOString() ?? new Date().toISOString(),
        distanceKm: activeTrip.distance_km ?? 0,
      }
    : null;

  // 5. Recent active alerts (last 10)
  const alertRows = await findMany<AlertRow>(
    `SELECT id, alert_type, severity FROM alerts
     WHERE vehicle_id = $1 AND status = 'active'
     ORDER BY created_at DESC LIMIT 10`,
    [vehicle.vehicle_id],
  );

  const activeAlerts = alertRows.map((a) => ({
    id: a.id,
    alertType: a.alert_type,
    severity: a.severity,
  }));

  return {
    vehicleId: vehicle.vehicle_id,
    status: vehicle.status,
    currentLocation,
    device: deviceInfo,
    currentTrip,
    activeAlerts,
  };
};

// Suppress unused import for pool (used via findOne/findMany which import it internally)
void pool;
