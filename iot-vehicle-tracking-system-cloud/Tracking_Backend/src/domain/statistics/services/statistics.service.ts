import {
  getFleetUsage,
  getDeviceUptime,
  getAlertFrequency,
  getTripSummary,
  getSummaryTotals,
  getPolicyLimitsSummary,
} from '@/domain/statistics/repositories/statistics.repository';
import type {
  StatisticsDateRange,
  StatisticsInterval,
  StatisticsSummary,
  PolicyLimitsSummary,
} from '@/domain/statistics/types/statistics.types';
import { createValidationError } from '@/shared/utils/errors.util';

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
}) => {
  const range = parseRange(params.from, params.to);
  const interval = parseInterval(params.interval);

  const data = await getFleetUsage(range, interval);
  return {
    labels: data.map((item) => item.label),
    activeVehicles: data.map((item) => item.activeVehicles),
    inactiveVehicles: data.map((item) => item.inactiveVehicles),
  };
};

export const getDeviceUptimeStats = async (params: { from?: string; to?: string }) => {
  const range = parseRange(params.from, params.to);
  const devices = await getDeviceUptime(range);
  return { devices };
};

export const getAlertFrequencyStats = async (params: {
  from?: string;
  to?: string;
  interval?: string;
}) => {
  const range = parseRange(params.from, params.to);
  const interval = parseInterval(params.interval);

  const data = await getAlertFrequency(range, interval);
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
}) => {
  const range = parseRange(params.from, params.to);
  const interval = parseInterval(params.interval);

  const data = await getTripSummary(range, interval);
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
}): Promise<StatisticsSummary> => {
  const range = parseRange(params.from, params.to);

  const [totals, uptime] = await Promise.all([getSummaryTotals(range), getDeviceUptime(range)]);

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

export const getPolicyLimitsStats = async (): Promise<{ items: PolicyLimitsSummary[] }> => {
  const rows = await getPolicyLimitsSummary();
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
