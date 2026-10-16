import { createHash } from 'node:crypto';
import { logger } from '@/infrastructure/logger';
import * as autoTripRepo from '@/domain/trip/repositories/trip-auto.repository';

interface SessionBoundaryPayload {
  device_id: string;
  session_id: number;
  action: 'started' | 'ended' | 'discarded';
  occurred_at: string;
}

const parseOccurredAt = (value: string): Date | null => {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
};

const handleSessionStarted = async (
  deviceId: string,
  sessionId: number,
  occurredAt: Date,
): Promise<void> => {
  const vehicle = await autoTripRepo.findVehicleByDevice(deviceId);
  if (!vehicle) {
    logger.debug(
      `Session ${sessionId} started for device "${deviceId}" without an assigned vehicle; auto-trip skipped`,
    );
    return;
  }

  const tripCode = buildAutoTripCode(deviceId, sessionId);
  let inserted = false;

  await autoTripRepo.withVehicleTripLock(vehicle.vehicle_id, async (tx) => {
    const byCode = await tx.findByCode(tripCode);
    if (byCode) {
      logger.debug(`Duplicate session-start for ${tripCode}; auto-trip already exists`);
      return;
    }

    const existingActive = await tx.findLatestActive(vehicle.vehicle_id);
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

    inserted = await tx.insertStarted(tripCode, vehicle.vehicle_id, deviceId, occurredAt);
  });

  if (inserted) {
    logger.info(
      `Session ${sessionId} auto-started trip "${tripCode}" for vehicle "${vehicle.vehicle_id}" at ${occurredAt.toISOString()}`,
    );
  }
};

const handleSessionEnded = async (
  deviceId: string,
  sessionId: number,
  occurredAt: Date,
): Promise<void> => {
  const tripCode = buildAutoTripCode(deviceId, sessionId);
  const trip = await autoTripRepo.findTripByCode(tripCode);

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

  const updated = await autoTripRepo.finishTrip(trip.id, 'completed', actualEnd);
  if (!updated) return; // Concurrent completion/replay already changed the row.

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
  const trip = await autoTripRepo.findTripByCode(tripCode);

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

  const updated = await autoTripRepo.finishTrip(trip.id, 'cancelled', actualEnd);
  if (!updated) return; // Concurrent completion/replay already changed the row.

  logger.info(
    `Session ${sessionId} discarded; cancelled auto-trip "${tripCode}" at ${actualEnd.toISOString()}`,
  );
};

/**
 * Keep automatic trips aligned with the firmware-authoritative device-session lifecycle.
 * Device and session identity deterministically form trip_code so QoS replay is idempotent.
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
    throw err;
  }
};
