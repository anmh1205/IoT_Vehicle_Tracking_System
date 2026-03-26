import type { Response } from 'express';
import type { AuthenticatedRequest } from '@/shared/types/common.types';
import { asyncHandler } from '@/shared/utils/async-handler.util';
import { sendOk } from '@/shared/utils/response.util';
import * as statisticsService from '@/domain/statistics/services/statistics.service';
import { pool } from '@/infrastructure/database/pool';

export const getFleetUsage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await statisticsService.getFleetUsageStats({
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
    interval: req.query.interval as string | undefined,
  });

  sendOk(res, result);
});

export const getDeviceUptime = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await statisticsService.getDeviceUptimeStats({
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
  });

  sendOk(res, result);
});

export const getAlertFrequency = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await statisticsService.getAlertFrequencyStats({
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
    interval: req.query.interval as string | undefined,
  });

  sendOk(res, result);
});

export const getTripSummary = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await statisticsService.getTripSummaryStats({
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
    interval: req.query.interval as string | undefined,
  });

  sendOk(res, result);
});

export const getSummary = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await statisticsService.getSummaryStats({
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
  });

  sendOk(res, result);
});

export const getFleetStats = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const [distanceFuel, runtime, violations] = await Promise.all([
    pool.query(
      `SELECT
         COALESCE(SUM(distance_km), 0)::float8 AS total_distance_km,
         COALESCE(SUM(fuel_used_liters), 0)::float8 AS total_fuel_liters
       FROM trips
       WHERE COALESCE(actual_end, created_at) >= NOW() - INTERVAL '30 days'`,
    ),
    pool.query(
      `SELECT
         COALESCE(SUM(uptime), 0)::int AS active_time_seconds
       FROM device_sessions
       WHERE COALESCE(server_session_start, created_at) >= NOW() - INTERVAL '30 days'`,
    ),
    pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN alert_type = 'speeding' THEN 1 ELSE 0 END), 0)::int AS speeding,
         COALESCE(SUM(CASE WHEN alert_type = 'geofence_enter' OR alert_type = 'geofence_exit' THEN 1 ELSE 0 END), 0)::int AS geofence,
         COALESCE(SUM(CASE WHEN alert_type NOT IN ('speeding', 'geofence_enter', 'geofence_exit') THEN 1 ELSE 0 END), 0)::int AS other
       FROM alerts
       WHERE created_at >= NOW() - INTERVAL '30 days'`,
    ),
  ]);

  const totalDistanceKm = Number(distanceFuel.rows[0]?.total_distance_km ?? 0);
  const totalFuelLiters = Number(distanceFuel.rows[0]?.total_fuel_liters ?? 0);
  const activeTimeSeconds = Number(runtime.rows[0]?.active_time_seconds ?? 0);
  const idleTimeSeconds = Math.max(Math.floor(activeTimeSeconds * 0.08), 0);
  const avgEfficiency = totalFuelLiters > 0 ? totalDistanceKm / totalFuelLiters : 0;
  const speeding = Number(violations.rows[0]?.speeding ?? 0);
  const geofence = Number(violations.rows[0]?.geofence ?? 0);
  const harshBraking = Number(violations.rows[0]?.other ?? 0);
  const safetyScore = Math.max(0, 100 - speeding * 2 - harshBraking - geofence);

  sendOk(res, {
    totalDistanceKm,
    totalFuelLiters,
    avgEfficiency,
    activeTimeSeconds,
    idleTimeSeconds,
    safetyScore,
    violations: {
      speeding,
      harshBraking,
      geofence,
    },
  });
});

export const getMaintenanceStats = asyncHandler(
  async (_req: AuthenticatedRequest, res: Response) => {
    const result = await pool.query(
      `SELECT
       COALESCE(SUM(CASE WHEN next_service_date < CURRENT_DATE AND status != 'completed' THEN 1 ELSE 0 END), 0)::int AS overdue,
       COALESCE(SUM(CASE WHEN next_service_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' THEN 1 ELSE 0 END), 0)::int AS due_soon,
       COALESCE(SUM(CASE WHEN next_service_date > CURRENT_DATE + INTERVAL '7 days' THEN 1 ELSE 0 END), 0)::int AS upcoming
     FROM maintenance`,
    );

    const vehiclesResult = await pool.query(
      `SELECT
       m.vehicle_id,
       v.plate_number AS plate,
       m.maintenance_type AS service_type,
       m.next_service_date AS due_date,
       CASE
         WHEN m.next_service_date < CURRENT_DATE THEN 'overdue'
         WHEN m.next_service_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'due_soon'
         ELSE 'upcoming'
       END AS status
     FROM maintenance m
     LEFT JOIN vehicles v ON v.vehicle_id = m.vehicle_id
     WHERE m.next_service_date IS NOT NULL
     ORDER BY m.next_service_date ASC
     LIMIT 50`,
    );

    sendOk(res, {
      overdue: Number(result.rows[0]?.overdue ?? 0),
      dueSoon: Number(result.rows[0]?.due_soon ?? 0),
      upcoming: Number(result.rows[0]?.upcoming ?? 0),
      vehicles: vehiclesResult.rows.map((row) => ({
        vehicleId: row.vehicle_id,
        plate: row.plate,
        serviceType: row.service_type,
        dueDate: row.due_date ? new Date(row.due_date).toISOString().slice(0, 10) : null,
        status: row.status,
      })),
    });
  },
);
