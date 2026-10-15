import { createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import { findOne, updateOne } from '@/infrastructure/database/queries';
import { pool } from '@/infrastructure/database/pool';
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

const buildAutoTripCode = (deviceId: string, sessionId: number): string => {
  const legacyCode = `AUTO-${deviceId}-SESSION-${sessionId}`;
  if (legacyCode.length <= 50) return legacyCode;

  // Schema trip_code is VARCHAR(50); preserve existing short-code identity
  // while using a collision-resistant deterministic identifier for long device IDs.
  const digest = createHash('sha256').update(deviceId).update(':')
    .update(String(sessionId)).digest('hex').slice(0, 40);
  return `AUTO-${digest}`;
};

const withVehicleTripLock = async (
  vehicleId: string,
  action: (client: PoolClient) => Promise<void>,
): Promise<void> => {
  const client = await pool.connect();
  let committed = false;
  try {
    await client.query('BEGIN');
    // Same vehicle's session-start events serialize across backend replicas.
    // PostgreSQL READ COMMITTED takes a fresh snapshot after this lock.
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))', [vehicleId]);
    await action(client);
    await client.query('COMMIT');
    committed = true;
  } finally {
    if (!committed) {
      try {
        await client.query('ROLLBACK');
      } catch (error) {
        logger.error('Failed to roll back auto-trip transaction', { error });
      }
    }
    client.release();
  }
};

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
  let inserted = false;

  await withVehicleTripLock(vehicle.vehicle_id, async (client) => {
    const byCode = await client.query<Trip>(
      'SELECT * FROM trips WHERE trip_code = $1 LIMIT 1',
      [tripCode],
    );
    if (byCode.rows[0]) {
      logger.debug(`Duplicate session-start for ${tripCode}; auto-trip already exists`);
      return;
    }

    const activeResult = await client.query<Trip>(
      `SELECT * FROM trips
       WHERE vehicle_id = $1 AND status = 'in_progress'
       ORDER BY actual_start DESC, id DESC LIMIT 1`,
      [vehicle.vehicle_id],
    );
    const existingActive = activeResult.rows[0];
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

    const insertedResult = await client.query<Trip>(
      `INSERT INTO trips (
         trip_code, vehicle_id, device_id, status, actual_start, created_at, updated_at
       ) VALUES ($1, $2, $3, 'in_progress', $4, NOW(), NOW())
       ON CONFLICT (trip_code) DO NOTHING
       RETURNING *`,
      [tripCode, vehicle.vehicle_id, deviceId, occurredAt.toISOString()],
    );
    inserted = Boolean(insertedResult.rows[0]);
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
