import {
  getFleetUsage,
  getDeviceUptime,
  getAlertFrequency,
  getTripSummary,
  getSummaryTotals,
} from '@/domain/statistics/repositories/statistics.repository';
import type {
  StatisticsDateRange,
  StatisticsInterval,
  StatisticsSummary,
} from '@/domain/statistics/types/statistics.types';
import { createValidationError } from '@/shared/utils/errors.util';

const DEFAULT_RANGE_DAYS = 30;

const parseDate = (value: string | undefined, fallback: Date): Date => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw createValidationError(`Invalid date value: ${value}`);
  }
  return date;
};

const parseRange = (from?: string, to?: string): StatisticsDateRange => {
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000);

  const parsedFrom = parseDate(from, defaultFrom);
  const parsedTo = parseDate(to, now);

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
      geofence: data.map((item) => item.geofence),
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
