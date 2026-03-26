import { findOne, insertOne, updateOne } from '@/infrastructure/database/queries';
import { logger } from '@/infrastructure/logger';
import type { Trip } from '@/domain/trip/types/trip.types';

interface IgnitionPayload {
  device_id: string;
  vehicle_id: string;
  state: 'on' | 'off';
}

/** Find the active (in_progress) trip for a vehicle */
const findActiveTrip = (vehicleId: string): Promise<Trip | null> =>
  findOne<Trip>(
    `SELECT * FROM trips WHERE vehicle_id = $1 AND status = 'in_progress' ORDER BY actual_start DESC LIMIT 1`,
    [vehicleId],
  );

/** Auto-start a trip when ignition turns ON */
const handleIgnitionOn = async (deviceId: string, vehicleId: string): Promise<void> => {
  // Check if there's already an active trip
  const existing = await findActiveTrip(vehicleId);
  if (existing) {
    logger.info(`Ignition ON: vehicle "${vehicleId}" already has active trip ${existing.id}, skipping`);
    return;
  }

  // Generate unique trip code from device + timestamp
  const tripCode = `AUTO-${deviceId}-${Date.now()}`;

  const trip = await insertOne<Trip>(
    `INSERT INTO trips (trip_code, vehicle_id, device_id, status, actual_start, created_at, updated_at)
     VALUES ($1, $2, $3, 'in_progress', NOW(), NOW(), NOW())
     RETURNING *`,
    [tripCode, vehicleId, deviceId],
  );

  logger.info(`Ignition ON: auto-started trip "${tripCode}" for vehicle "${vehicleId}" (device: ${deviceId})`);
  return void trip;
};

/** Auto-end the active trip when ignition turns OFF */
const handleIgnitionOff = async (vehicleId: string): Promise<void> => {
  const activeTrip = await findActiveTrip(vehicleId);
  if (!activeTrip) {
    logger.debug(`Ignition OFF: no active trip found for vehicle "${vehicleId}", skipping`);
    return;
  }

  await updateOne<Trip>(
    `UPDATE trips SET status = 'completed', actual_end = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *`,
    [activeTrip.id],
  );

  logger.info(`Ignition OFF: auto-ended trip "${activeTrip.trip_code}" for vehicle "${vehicleId}"`);
};

/**
 * Handle ignition ON/OFF events to auto-manage trips.
 * Called from MQTT event listener when ignition state changes.
 */
export const handleIgnitionEvent = async (payload: IgnitionPayload): Promise<void> => {
  const { device_id, vehicle_id, state } = payload;

  try {
    if (state === 'on') {
      await handleIgnitionOn(device_id, vehicle_id);
    } else {
      await handleIgnitionOff(vehicle_id);
    }
  } catch (err) {
    logger.error(`Failed to handle ignition ${state} event for vehicle "${vehicle_id}": ${err}`);
  }
};
