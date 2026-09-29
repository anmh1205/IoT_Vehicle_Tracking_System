import { findMany } from '@/infrastructure/database/queries';
import { logger } from '@/infrastructure/logger';
import { handleSessionBoundaryEvent } from './trip-auto.service';

const RECONCILE_INTERVAL_MS = 60_000;
const RECONCILE_BATCH_LIMIT = 100;

interface SessionRepairRow {
  id: number;
  device_id: string;
  status: 'running' | 'completed';
  start_at: Date | string;
  end_at: Date | string | null;
  trip_status: string | null;
}

interface OrphanAutoTripRow {
  trip_code: string;
  device_id: string;
  actual_start: Date | string | null;
}

let reconciliationTimer: NodeJS.Timeout | null = null;
let reconciliationPromise: Promise<void> | null = null;

const toIso = (value: Date | string | null): string | null => {
  if (value == null) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
};

const parseAutoTripSessionId = (tripCode: string, deviceId: string): number | null => {
  const prefix = `AUTO-${deviceId}-SESSION-`;
  if (!tripCode.startsWith(prefix)) {
    return null;
  }
  const value = Number(tripCode.slice(prefix.length));
  return Number.isSafeInteger(value) && value > 0 ? value : null;
};

const listSessionRepairs = (): Promise<SessionRepairRow[]> =>
  findMany<SessionRepairRow>(
    `SELECT
       s.id,
       s.device_id,
       s.status,
       COALESCE(s.session_start, s.server_session_start, s.created_at) AS start_at,
       COALESCE(
         s.session_end,
         s.server_session_end,
         s.last_update,
         s.session_start,
         s.server_session_start,
         s.created_at
       ) AS end_at,
       t.status AS trip_status
     FROM device_sessions s
     LEFT JOIN trips t
       ON t.trip_code = ('AUTO-' || s.device_id || '-SESSION-' || s.id::text)
     WHERE s.status IN ('running', 'completed')
       AND (
         t.id IS NULL
         OR (s.status = 'completed' AND t.status = 'in_progress')
       )
     ORDER BY COALESCE(s.session_end, s.session_start, s.created_at) ASC, s.id ASC
     LIMIT $1`,
    [RECONCILE_BATCH_LIMIT],
  );

const listOrphanAutoTrips = (): Promise<OrphanAutoTripRow[]> =>
  findMany<OrphanAutoTripRow>(
    `SELECT t.trip_code, t.device_id, t.actual_start
     FROM trips t
     LEFT JOIN device_sessions s
       ON t.trip_code = ('AUTO-' || s.device_id || '-SESSION-' || s.id::text)
     WHERE t.status = 'in_progress'
       AND t.trip_code LIKE 'AUTO-%-SESSION-%'
       AND t.device_id IS NOT NULL
       AND s.id IS NULL
     ORDER BY t.updated_at ASC, t.id ASC
     LIMIT $1`,
    [RECONCILE_BATCH_LIMIT],
  );

const reconcileSessionRow = async (row: SessionRepairRow): Promise<void> => {
  const startAt = toIso(row.start_at);
  if (!startAt) {
    logger.warn('Auto-trip reconciliation skipped session with invalid start boundary', {
      sessionId: row.id,
      deviceId: row.device_id,
      startAt: row.start_at,
    });
    return;
  }

  if (row.trip_status == null) {
    await handleSessionBoundaryEvent({
      device_id: row.device_id,
      session_id: row.id,
      action: 'started',
      occurred_at: startAt,
    });
  }

  if (row.status !== 'completed') {
    return;
  }

  const endAt = toIso(row.end_at) ?? startAt;
  await handleSessionBoundaryEvent({
    device_id: row.device_id,
    session_id: row.id,
    action: 'ended',
    occurred_at: endAt,
  });
};

const reconcileOrphanTrip = async (row: OrphanAutoTripRow): Promise<void> => {
  const sessionId = parseAutoTripSessionId(row.trip_code, row.device_id);
  if (sessionId === null) {
    logger.warn('Auto-trip reconciliation skipped malformed automatic trip code', {
      tripCode: row.trip_code,
      deviceId: row.device_id,
    });
    return;
  }

  const occurredAt = toIso(row.actual_start) ?? new Date(0).toISOString();
  await handleSessionBoundaryEvent({
    device_id: row.device_id,
    session_id: sessionId,
    action: 'discarded',
    occurred_at: occurredAt,
  });
};

const reconcileAutoTripsOnce = async (): Promise<void> => {
  const sessionRows = await listSessionRepairs();
  for (const row of sessionRows) {
    try {
      await reconcileSessionRow(row);
    } catch (error) {
      logger.error('Failed to reconcile automatic trip from device session', {
        error: error instanceof Error ? error.message : String(error),
        sessionId: row.id,
        deviceId: row.device_id,
      });
    }
  }

  const orphanTrips = await listOrphanAutoTrips();
  for (const row of orphanTrips) {
    try {
      await reconcileOrphanTrip(row);
    } catch (error) {
      logger.error('Failed to reconcile orphan automatic trip', {
        error: error instanceof Error ? error.message : String(error),
        tripCode: row.trip_code,
        deviceId: row.device_id,
      });
    }
  }
};

export const runAutoTripReconciliation = (): Promise<void> => {
  if (reconciliationPromise) {
    return reconciliationPromise;
  }

  reconciliationPromise = reconcileAutoTripsOnce().finally(() => {
    reconciliationPromise = null;
  });
  return reconciliationPromise;
};

export const initAutoTripReconciler = (): void => {
  if (reconciliationTimer) {
    return;
  }

  void runAutoTripReconciliation().catch((error) => {
    logger.error('Initial auto-trip reconciliation failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  });

  reconciliationTimer = setInterval(() => {
    void runAutoTripReconciliation().catch((error) => {
      logger.error('Periodic auto-trip reconciliation failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }, RECONCILE_INTERVAL_MS);
  reconciliationTimer.unref?.();
};

export const closeAutoTripReconciler = async (): Promise<void> => {
  if (reconciliationTimer) {
    clearInterval(reconciliationTimer);
    reconciliationTimer = null;
  }

  const inFlight = reconciliationPromise;
  if (inFlight) {
    try {
      await inFlight;
    } catch {
      // Shutdown continues; the next process start performs an immediate repair pass.
    }
  }
};
