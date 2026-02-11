import * as fuelAnalyticsRepository from '@/domain/fuel-analytics/repositories/fuel-analytics.repository';
import type {
  FuelDateRange,
  FuelInterval,
} from '@/domain/fuel-analytics/types/fuel-analytics.types';
import { createValidationError } from '@/shared/utils/errors.util';

const DEFAULT_RANGE_DAYS = 30;
const DEFAULT_FUEL_PRICE_VND = 25000;

const parseDate = (value: string | undefined, fallback: Date): Date => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw createValidationError(`Invalid date value: ${value}`);
  }
  return date;
};

const parseRange = (from?: string, to?: string): FuelDateRange => {
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000);

  const parsedFrom = parseDate(from, defaultFrom);
  const parsedTo = parseDate(to, now);

  if (parsedFrom > parsedTo) {
    throw createValidationError('"from" must be earlier than or equal to "to"');
  }

  return { from: parsedFrom, to: parsedTo };
};

const parseInterval = (value?: string): FuelInterval => {
  if (!value || value === 'day' || value === 'week' || value === 'month') {
    return (value ?? 'day') as FuelInterval;
  }
  throw createValidationError('Invalid interval. Allowed values: day, week, month');
};

export const getFuelSummary = async (params: {
  from?: string;
  to?: string;
  fuelPrice?: number;
}) => {
  const range = parseRange(params.from, params.to);
  const fuelPrice = params.fuelPrice ?? DEFAULT_FUEL_PRICE_VND;

  const summary = await fuelAnalyticsRepository.getSummary(range);
  summary.totalCost = Math.round(summary.totalFuelUsed * fuelPrice);

  return summary;
};

export const getFuelByVehicle = async (params: { from?: string; to?: string }) => {
  const range = parseRange(params.from, params.to);
  const vehicles = await fuelAnalyticsRepository.getByVehicle(range);
  return { vehicles };
};

export const getFuelTrends = async (params: {
  from?: string;
  to?: string;
  interval?: string;
}) => {
  const range = parseRange(params.from, params.to);
  const interval = parseInterval(params.interval);
  const trends = await fuelAnalyticsRepository.getTrends(range, interval);
  return { trends };
};
