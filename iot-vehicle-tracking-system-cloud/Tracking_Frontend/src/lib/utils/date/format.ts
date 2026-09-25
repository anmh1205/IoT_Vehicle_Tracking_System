import { format as formatDate, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

const DEFAULT_DATE_PATTERN = 'dd/MM/yyyy HH:mm';
const NUMBER_FORMATTER_CACHE = new Map<string, Intl.NumberFormat>();

interface FormatNumberOptions {
  fallback?: string;
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
}

const getNumberFormatter = (
  minimumFractionDigits = 0,
  maximumFractionDigits = 2,
) => {
  const cacheKey = `${minimumFractionDigits}:${maximumFractionDigits}`;
  const cached = NUMBER_FORMATTER_CACHE.get(cacheKey);

  if (cached) {
    return cached;
  }

  const formatter = new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits,
    maximumFractionDigits,
  });
  NUMBER_FORMATTER_CACHE.set(cacheKey, formatter);
  return formatter;
};

const parseDate = (value: string | number | Date | null | undefined): Date | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
};
export const formatDateTime = (
  value: string | number | Date | null | undefined,
  pattern = DEFAULT_DATE_PATTERN,
): string => {
  const date = parseDate(value);
  return date ? formatDate(date, pattern) : '-';
};
export const formatDuration = (totalSeconds: number | null | undefined): string => {
  const seconds = Math.max(0, Math.floor(totalSeconds ?? 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
};
export const formatTime = (totalSeconds: number | null | undefined): string => {
  return formatDuration(totalSeconds);
};

export const formatNumber = (
  value: number | string | null | undefined,
  options: FormatNumberOptions = {},
): string => {
  const {
    fallback = '0',
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
  } = options;

  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const numericValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numericValue)) {
    return String(value);
  }

  return getNumberFormatter(minimumFractionDigits, maximumFractionDigits).format(numericValue);
};

export const roundNumber = (value: number, maximumFractionDigits = 2): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const precision = Math.max(0, Math.floor(maximumFractionDigits));
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

export const formatRelative = (value: string | number | Date | null | undefined): string => {
  const date = parseDate(value);
  if (!date) {
    return '-';
  }
  return formatDistanceToNow(date, {
    addSuffix: true,
    locale: vi,
  });
};
