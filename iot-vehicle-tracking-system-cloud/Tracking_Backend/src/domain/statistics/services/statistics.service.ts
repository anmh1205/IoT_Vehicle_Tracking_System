import type { SessionUser } from '@/shared/types/common.types';
import {
  getFleetUsage,
  getDeviceUptime,
  getAlertFrequency,
  getTripSummary,
  getSummaryTotals,
  getPolicyLimitsSummary,
  getFleetTotalsLast30Days,
  getMaintenanceTotalsAndVehicles,
} from '@/domain/statistics/repositories/statistics.repository';
import type {
  StatisticsDateRange,
  StatisticsInterval,
  StatisticsSummary,
  PolicyLimitsSummary,
} from '@/domain/statistics/types/statistics.types';
import { createValidationError } from '@/shared/utils/errors.util';
import { isUndefinedTableError } from '@/shared/utils/postgres-error.util';

const DEFAULT_RANGE_DAYS = 30;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const parseDate = (
  value: string | undefined,
  fallback: Date,
  boundary: 'start' | 'end',
): Date => {
  if (!value) return fallback;
  const trimmed = value.trim();
  const date = DATE_ONLY_PATTERN.test(trimmed)
    ? new Date(`${trimmed}T00:00:00.000Z`)
    : new Date(trimmed);

  if (Number.isNaN(date.getTime())) {
    throw createValidationError(`Invalid date value: ${value}`);
  }

  if (boundary === 'end' && DATE_ONLY_PATTERN.test(trimmed)) {
    date.setUTCHours(23, 59, 59, 999);
  }

  return date;
};

const parseRange = (from?: string, to?: string): StatisticsDateRange => {
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000);

  const parsedFrom = parseDate(from, defaultFrom, 'start');
  const parsedTo = parseDate(to, now, 'end');

  if (parsedFrom > parsedTo) {
    throw createValidationError('"from" must be earlier than or equal to "to"');
  }

  return { from: parsedFrom, to: parsedTo };
};

const parseInterval = (value?: string): StatisticsInterval => {
  if (!value || value === 'day' || value === 'week' || value === 'month') {
    return (value ?? 'day') as StatisticsInterval;
  }
  throw createValidationError('Invalid interval. Allowed values: day, week, month');
};

export const getFleetUsageStats = async (params: {
  from?: string;
  to?: string;
  interval?: string;
},
  actor: SessionUser,
) => {
  const range = parseRange(params.from, params.to);
  const interval = parseInterval(params.interval);

  const data = await getFleetUsage(range, interval, actor);
  return {
    labels: data.map((item) => item.label),
    activeVehicles: data.map((item) => item.activeVehicles),
    inactiveVehicles: data.map((item) => item.inactiveVehicles),
  };
};

export const getDeviceUptimeStats = async (params: { from?: string; to?: string },
  actor: SessionUser,
) => {
  const range = parseRange(params.from, params.to);
  const devices = await getDeviceUptime(range, actor);
  return { devices };
};

export const getAlertFrequencyStats = async (params: {
  from?: string;
  to?: string;
  interval?: string;
},
  actor: SessionUser,
) => {
  const range = parseRange(params.from, params.to);
  const interval = parseInterval(params.interval);

  const data = await getAlertFrequency(range, interval, actor);
  return {
    labels: data.map((item) => item.label),
    series: {
      speeding: data.map((item) => item.speeding),
      zone: data.map((item) => item.zone),
      offline: data.map((item) => item.offline),
      other: data.map((item) => item.other),
    },
  };
};

export const getTripSummaryStats = async (params: {
  from?: string;
  to?: string;
  interval?: string;
},
  actor: SessionUser,
) => {
  const range = parseRange(params.from, params.to);
  const interval = parseInterval(params.interval);

  const data = await getTripSummary(range, interval, actor);
  return {
    labels: data.map((item) => item.label),
    totalTrips: data.map((item) => item.totalTrips),
    totalDistanceKm: data.map((item) => item.totalDistanceKm),
    avgDuration: data.map((item) => item.avgDurationMinutes),
  };
};

export const getSummaryStats = async (params: {
  from?: string;
  to?: string;
},
  actor: SessionUser,
): Promise<StatisticsSummary> => {
  const range = parseRange(params.from, params.to);

  const [totals, uptime] = await Promise.all([getSummaryTotals(range, actor), getDeviceUptime(range, actor)]);

  const averageUptimePercent =
    uptime.length > 0
      ? uptime.reduce((sum, item) => sum + item.uptimePercent, 0) / uptime.length
      : 0;

  return {
    totalRuntimeHours: Number(totals.totalRuntimeHours.toFixed(2)),
    averageUptimePercent: Number(averageUptimePercent.toFixed(2)),
    totalSessions: totals.totalSessions,
    totalAlerts: totals.totalAlerts,
  };
};

export const getPolicyLimitsStats = async (actor: SessionUser): Promise<{ items: PolicyLimitsSummary[] }> => {
  const rows = await getPolicyLimitsSummary(actor);
  return {
    items: rows.map((row) => {
      const quotaLimitKm = Number.parseFloat(row.quota_limit_km ?? '0') || 0;
      const consumedMeters = Number.parseFloat(row.consumed_m ?? '0') || 0;
      const consumedKm = Number((consumedMeters / 1000).toFixed(3));
      return {
        vehicleId: row.vehicle_id,
        quotaLimitKm,
        consumedKm,
        remainingKm: Number(Math.max(quotaLimitKm - consumedKm, 0).toFixed(3)),
        quotaState: row.quota_state,
        cycleStartAt: row.cycle_start_at?.toISOString() ?? null,
        cycleEndAt: row.cycle_end_at?.toISOString() ?? null,
        updatedAt: row.updated_at.toISOString(),
      };
    }),
  };
};

export const getFleetStats = async (actor: SessionUser) => {
  const { distanceFuel, runtime, violations } = await getFleetTotalsLast30Days(actor);
  const totalDistanceKm = Number(distanceFuel?.total_distance_km ?? 0);
  const totalFuelLiters = Number(distanceFuel?.total_fuel_liters ?? 0);
  const activeTimeSeconds = Number(runtime?.active_time_seconds ?? 0);
  // Historical idle-time estimate is tracked separately by #198.
  const idleTimeSeconds = Math.max(Math.floor(activeTimeSeconds * 0.08), 0);
  const avgEfficiency = totalFuelLiters > 0 ? totalDistanceKm / totalFuelLiters : 0;
  const speeding = Number(violations?.speeding ?? 0);
  const zone = Number(violations?.zone ?? 0);
  const harshBraking = Number(violations?.other ?? 0);
  const safetyScore = Math.max(0, 100 - speeding * 2 - harshBraking - zone);
  return {
    totalDistanceKm, totalFuelLiters, avgEfficiency, activeTimeSeconds,
    idleTimeSeconds, safetyScore,
    violations: { speeding, harshBraking, zone },
  };
};

export const getMaintenanceStats = async (actor: SessionUser) => {
  try {
    const { totals, vehicles } = await getMaintenanceTotalsAndVehicles(actor);
    return {
      overdue: Number(totals?.overdue ?? 0),
      dueSoon: Number(totals?.due_soon ?? 0),
      upcoming: Number(totals?.upcoming ?? 0),
      vehicles: vehicles.map((row) => ({
        vehicleId: row.vehicle_id,
        plate: row.plate,
        serviceType: row.service_type,
        dueDate: row.due_date ? new Date(row.due_date).toISOString().slice(0, 10) : null,
        status: row.status,
      })),
    };
  } catch (error) {
    if (isUndefinedTableError(error)) {
      return { overdue: 0, dueSoon: 0, upcoming: 0, vehicles: [] };
    }
    throw error;
  }
};
