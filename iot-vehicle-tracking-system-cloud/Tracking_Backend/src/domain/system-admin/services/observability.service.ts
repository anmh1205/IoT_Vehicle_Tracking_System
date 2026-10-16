import * as vmRepo from '@/domain/system-admin/repositories/victoriametrics.repository';
import * as vlRepo from '@/domain/system-admin/repositories/victorialogs.repository';
import { createValidationError } from '@/shared/utils/errors.util';
import type {
  SystemAdminLogsQueryInput, SystemAdminLogsQueryResult,
  SystemAdminMetricsQueryInput, SystemAdminMetricsQueryResult,
} from '@/domain/system-admin/types/system-admin-vm-settings.types';

const RANGE_TIME_RE = /^(\d+)([smhdw])$/i;

const toDurationSeconds = (value: string): number | null => {
  const match = RANGE_TIME_RE.exec(value.trim());
  if (!match) {
    return null;
  }

  const amount = Number.parseInt(match[1] ?? '0', 10);
  const unit = (match[2] ?? '').toLowerCase();
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const multiplier =
    unit === 's'
      ? 1
      : unit === 'm'
        ? 60
        : unit === 'h'
          ? 60 * 60
          : unit === 'd'
            ? 24 * 60 * 60
            : unit === 'w'
              ? 7 * 24 * 60 * 60
              : 0;

  return multiplier > 0 ? amount * multiplier : null;
};

const getRangeStep = (durationSeconds: number): string => {
  const stepSeconds = Math.max(15, Math.ceil(durationSeconds / 240));
  return `${stepSeconds}s`;
};

export const queryMetrics = async (
  params: SystemAdminMetricsQueryInput,
): Promise<SystemAdminMetricsQueryResult> => {
  const query = params.query.trim();
  const time = params.time?.trim();

  if (!query) {
    throw createValidationError('SYSTEM_ADMIN_METRICS_QUERY_REQUIRED');
  }
  const durationSeconds = time ? toDurationSeconds(time) : null;

  if (durationSeconds) {
    const endSec = Math.floor(Date.now() / 1000);
    const startSec = endSec - durationSeconds;
    const step = getRangeStep(durationSeconds);
    const result = await vmRepo.queryRange(query, startSec, endSec, step);
    return {
      query,
      time,
      rangeApplied: true,
      step,
      source: 'victoriametrics',
      result,
    };
  }

  const result = await vmRepo.query(query, time);
  return {
    query,
    time,
    rangeApplied: false,
    source: 'victoriametrics',
    result,
  };
};

const normalizeLogLevel = (value: unknown): 'error' | 'warn' | 'info' | 'debug' => {
  const level = String(value ?? 'info').toLowerCase();
  if (level === 'error' || level === 'warn' || level === 'info' || level === 'debug') {
    return level;
  }
  return 'info';
};

export const queryLogs = async (
  params: SystemAdminLogsQueryInput,
): Promise<SystemAdminLogsQueryResult> => {
  const query = params.query.trim();
  if (!query) {
    throw createValidationError('SYSTEM_ADMIN_LOGS_QUERY_REQUIRED');
  }

  const rawLimit = params.limit ?? 50;
  const limit = Math.max(1, Math.min(rawLimit, 500));
  const offset = Math.max(0, params.offset ?? 0);

  const fetched = await vlRepo.query(query, limit + offset);
  const pagedItems = fetched.items.slice(offset, offset + limit);
  const items = pagedItems.map((item, index) => ({
    id: String(item._id ?? item.id ?? `${item.timestamp ?? index}`),
    timestamp: String(item.timestamp ?? new Date().toISOString()),
    level: normalizeLogLevel(item.level),
    source: String(item.source ?? 'system'),
    message: String(item.message ?? ''),
    stack: typeof item.stack === 'string' ? item.stack : null,
  }));

  return {
    query,
    pagination: {
      limit,
      offset,
      total: fetched.total,
      returned: items.length,
    },
    items,
  };
};
