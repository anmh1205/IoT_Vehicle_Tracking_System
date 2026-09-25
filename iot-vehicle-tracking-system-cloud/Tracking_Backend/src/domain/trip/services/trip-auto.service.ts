import { findOne, insertOne, updateOne } from '@/infrastructure/database/queries';
import { logger } from '@/infrastructure/logger';
import type { Trip } from '@/domain/trip/types/trip.types';

interface SessionBoundaryPayload {
  device_id: string;
  session_id: number;
  action: 'started' | 'ended' | 'discarded';
  occurred_at: string;
}

interface VehicleIdentityRow {
  vehicle_id: string;
}

const buildAutoTripCode = (deviceId: string, sessionId: number): string =>
  `AUTO-${deviceId}-SESSION-${sessionId}`;

const parseOccurredAt = (value: string): Date | null => {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
};

const findVehicleByDevice = (deviceId: string): Promise<VehicleIdentityRow | null> =>
  findOne<VehicleIdentityRow>(
    'SELECT vehicle_id FROM vehicles WHERE device_id = $1 ORDER BY updated_at DESC, id DESC LIMIT 1',
    [deviceId],
  );

const findTripByCode = (tripCode: string): Promise<Trip | null> =>
  findOne<Trip>('SELECT * FROM trips WHERE trip_code = $1 LIMIT 1', [tripCode]);

const findActiveTrip = (vehicleId: string): Promise<Trip | null> =>
  findOne<Trip>(
    `SELECT * FROM trips
     WHERE vehicle_id = $1 AND status = 'in_progress'
     ORDER BY actual_start DESC, id DESC
     LIMIT 1`,
    [vehicleId],
  );

const handleSessionStarted = async (
  deviceId: string,
  sessionId: number,
  occurredAt: Date,
): Promise<void> => {
  const vehicle = await findVehicleByDevice(deviceId);
  if (!vehicle) {
    logger.debug(
      `Session ${sessionId} started for device "${deviceId}" without an assigned vehicle; auto-trip skipped`,
    );
    return;
  }

  const tripCode = buildAutoTripCode(deviceId, sessionId);
  const existingByCode = await findTripByCode(tripCode);
  if (existingByCode) {
    logger.debug(`Duplicate session-start for ${tripCode}; auto-trip already exists`);
    return;
  }

  const existingActive = await findActiveTrip(vehicle.vehicle_id);
  if (existingActive) {
    const existingStart = existingActive.actual_start
      ? new Date(existingActive.actual_start)
      : null;
    const hasValidExistingStart =
      existingStart !== null && Number.isFinite(existingStart.getTime());

    if (!hasValidExistingStart || existingStart.getTime() <= occurredAt.getTime()) {
      logger.warn(
        `Session ${sessionId} started for vehicle "${vehicle.vehicle_id}" while trip "${existingActive.trip_code}" is still active; refusing to create an overlapping auto-trip`,
      );
      return;
    }

    logger.info(
      `Session ${sessionId} start predates newer active trip "${existingActive.trip_code}"; reconstructing historical auto-trip`,
    );
  }

  await insertOne<Trip>(
    `INSERT INTO trips (
       trip_code,
       vehicle_id,
       device_id,
       status,
       actual_start,
       created_at,
       updated_at
     )
     VALUES ($1, $2, $3, 'in_progress', $4, NOW(), NOW())
     RETURNING *`,
    [tripCode, vehicle.vehicle_id, deviceId, occurredAt.toISOString()],
  );

  logger.info(
    `Session ${sessionId} auto-started trip "${tripCode}" for vehicle "${vehicle.vehicle_id}" at ${occurredAt.toISOString()}`,
  );
};

const handleSessionEnded = async (
  deviceId: string,
  sessionId: number,
  occurredAt: Date,
): Promise<void> => {
  const tripCode = buildAutoTripCode(deviceId, sessionId);
  const trip = await findTripByCode(tripCode);

  if (!trip) {
    logger.debug(`Session-end for ${tripCode} has no matching auto-trip; skipping`);
    return;
  }

  if (trip.status === 'completed') {
    logger.debug(`Duplicate session-end for ${tripCode}; trip already completed`);
    return;
  }

  if (trip.status !== 'in_progress') {
    logger.warn(
      `Session-end for ${tripCode} ignored because trip status is "${trip.status}"`,
    );
    return;
  }

  const actualStart = trip.actual_start ? new Date(trip.actual_start) : null;
  const actualEnd =
    actualStart && occurredAt.getTime() < actualStart.getTime() ? actualStart : occurredAt;

  await updateOne<Trip>(
    `UPDATE trips
     SET status = 'completed', actual_end = $2, updated_at = NOW()
     WHERE id = $1 AND status = 'in_progress'
     RETURNING *`,
    [trip.id, actualEnd.toISOString()],
  );

  logger.info(
    `Session ${sessionId} auto-ended trip "${tripCode}" at ${actualEnd.toISOString()}`,
  );
};

const handleSessionDiscarded = async (
  deviceId: string,
  sessionId: number,
  occurredAt: Date,
): Promise<void> => {
  const tripCode = buildAutoTripCode(deviceId, sessionId);
  const trip = await findTripByCode(tripCode);

  if (!trip) {
    logger.debug(`Session-discard for ${tripCode} has no matching auto-trip; skipping`);
    return;
  }

  if (trip.status !== 'in_progress') {
    logger.debug(
      `Session-discard for ${tripCode} ignored because trip status is "${trip.status}"`,
    );
    return;
  }

  const actualStart = trip.actual_start ? new Date(trip.actual_start) : null;
  const actualEnd =
    actualStart && occurredAt.getTime() < actualStart.getTime() ? actualStart : occurredAt;

  await updateOne<Trip>(
    `UPDATE trips
     SET status = 'cancelled', actual_end = $2, updated_at = NOW()
     WHERE id = $1 AND status = 'in_progress'
     RETURNING *`,
    [trip.id, actualEnd.toISOString()],
  );

  logger.info(
    `Session ${sessionId} discarded; cancelled auto-trip "${tripCode}" at ${actualEnd.toISOString()}`,
  );
};

/**
 * Keep automatic trips aligned with the firmware-authoritative device-session lifecycle.
 * Session ID is embedded in trip_code so QoS replay/duplicate delivery is idempotent.
 */
export const handleSessionBoundaryEvent = async (
  payload: SessionBoundaryPayload,
): Promise<void> => {
  const { device_id: deviceId, session_id: sessionId, action, occurred_at: occurredAtRaw } = payload;
  const occurredAt = parseOccurredAt(occurredAtRaw);

  if (!deviceId || !Number.isSafeInteger(sessionId) || sessionId <= 0 || !occurredAt) {
    logger.warn('Invalid session boundary received by auto-trip service', {
      deviceId,
      sessionId,
      action,
      occurredAt: occurredAtRaw,
    });
    return;
  }

  try {
    if (action === 'started') {
      await handleSessionStarted(deviceId, sessionId, occurredAt);
      return;
    }

    if (action === 'discarded') {
      await handleSessionDiscarded(deviceId, sessionId, occurredAt);
      return;
    }

    await handleSessionEnded(deviceId, sessionId, occurredAt);
  } catch (err) {
    logger.error(
      `Failed to handle session ${action} for device "${deviceId}" / session ${sessionId}: ${err}`,
    );
  }
};
