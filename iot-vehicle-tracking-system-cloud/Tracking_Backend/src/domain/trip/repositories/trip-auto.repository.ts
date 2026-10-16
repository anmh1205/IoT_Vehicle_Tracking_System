import type { PoolClient } from 'pg';
import { findOne, updateOne } from '@/infrastructure/database/queries';
import { pool } from '@/infrastructure/database/pool';
import { logger } from '@/infrastructure/logger';
import type { Trip } from '@/domain/trip/types/trip.types';

interface VehicleIdentityRow { vehicle_id: string; }

/** Transaction port consumed by the auto-trip application policy. */
export interface AutoTripTransaction {
  findByCode(tripCode: string): Promise<Trip | null>;
  findLatestActive(vehicleId: string): Promise<Trip | null>;
  insertStarted(tripCode: string, vehicleId: string, deviceId: string, startedAt: Date): Promise<boolean>;
}

const transactionFor = (client: PoolClient): AutoTripTransaction => ({
  findByCode: async (tripCode) => {
    const result = await client.query<Trip>('SELECT * FROM trips WHERE trip_code = $1 LIMIT 1', [tripCode]);
    return result.rows[0] ?? null;
  },
  findLatestActive: async (vehicleId) => {
    const result = await client.query<Trip>(
      `SELECT * FROM trips WHERE vehicle_id = $1 AND status = 'in_progress'
       ORDER BY actual_start DESC, id DESC LIMIT 1`, [vehicleId],
    );
    return result.rows[0] ?? null;
  },
  insertStarted: async (tripCode, vehicleId, deviceId, startedAt) => {
    const result = await client.query<Trip>(
      `INSERT INTO trips (
         trip_code, vehicle_id, device_id, status, actual_start, created_at, updated_at
       ) VALUES ($1, $2, $3, 'in_progress', $4, NOW(), NOW())
       ON CONFLICT (trip_code) DO NOTHING
       RETURNING *`,
      [tripCode, vehicleId, deviceId, startedAt.toISOString()],
    );
    return Boolean(result.rows[0]);
  },
});

/** Serialize start policy for the same vehicle across backend replicas. */
export const withVehicleTripLock = async (
  vehicleId: string, action: (tx: AutoTripTransaction) => Promise<void>,
): Promise<void> => {
  const client = await pool.connect();
  let committed = false;
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))', [vehicleId]);
    await action(transactionFor(client));
    await client.query('COMMIT');
    committed = true;
  } finally {
    if (!committed) {
      try { await client.query('ROLLBACK'); }
      catch (error) { logger.error('Failed to roll back auto-trip transaction', { error }); }
    }
    client.release();
  }
};

export const findVehicleByDevice = (deviceId: string): Promise<VehicleIdentityRow | null> =>
  findOne<VehicleIdentityRow>(
    'SELECT vehicle_id FROM vehicles WHERE device_id = $1 ORDER BY updated_at DESC, id DESC LIMIT 1',
    [deviceId],
  );

export const findTripByCode = (tripCode: string): Promise<Trip | null> =>
  findOne<Trip>('SELECT * FROM trips WHERE trip_code = $1 LIMIT 1', [tripCode]);

export const finishTrip = (
  id: number, status: 'completed' | 'cancelled', endedAt: Date,
): Promise<Trip | null> =>
  updateOne<Trip>(
    `UPDATE trips SET status = $2, actual_end = $3, updated_at = NOW()
     WHERE id = $1 AND status = 'in_progress' RETURNING *`,
    [id, status, endedAt.toISOString()],
  );
