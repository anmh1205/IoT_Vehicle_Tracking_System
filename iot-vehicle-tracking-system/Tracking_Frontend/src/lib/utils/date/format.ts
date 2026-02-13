import { format as formatDate, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
const DEFAULT_DATE_PATTERN = 'dd/MM/yyyy HH:mm';
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
