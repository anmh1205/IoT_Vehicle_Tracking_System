import { pool } from '@/infrastructure/database/pool';
import * as vmRepo from '@/domain/system-admin/repositories/victoriametrics.repository';
import * as vlRepo from '@/domain/system-admin/repositories/victorialogs.repository';
import {
  getSystemHealth as getCoreSystemHealth,
  type SystemHealthPayload,
} from '@/domain/system/services/system-status.service';
import { createValidationError } from '@/shared/utils/errors.util';

export const getSystemHealth = async (): Promise<SystemHealthPayload> => {
  const health = await getCoreSystemHealth();
  return health;
};

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

export const queryMetrics = async (promql: string, time?: string): Promise<unknown> => {
  const durationSeconds = time ? toDurationSeconds(time) : null;
  if (durationSeconds) {
    const endSec = Math.floor(Date.now() / 1000);
    const startSec = endSec - durationSeconds;
    const result = await vmRepo.queryRange(promql, startSec, endSec, getRangeStep(durationSeconds));
    return result;
  }

  const result = await vmRepo.query(promql, time);
  return result;
};

export const queryLogs = async (logsql: string, limit?: number): Promise<unknown> => {
  const result = await vlRepo.query(logsql, limit);
  return result;
};

const ALLOWED_TABLES = [
  'users',
  'devices',
  'vehicles',
  'customers',
  'trips',
  'alerts',
  'geofences',
  'maintenance',
  'event_logs',
  'device_sessions',
  'export_jobs',
  'firmware',
  'vehicle_policies',
  'vehicle_policy_state',
  'policy_audit_logs',
] as const;

type AllowedTable = (typeof ALLOWED_TABLES)[number];

const assertTable = (table: string): AllowedTable => {
  if (!ALLOWED_TABLES.includes(table as AllowedTable)) {
    throw createValidationError(`Table "${table}" is not allowed`);
  }
  return table as AllowedTable;
};

export const listAvailableTables = async (): Promise<string[]> => {
  const result = await pool.query<{
    table_name: string;
  }>(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name = ANY($1::text[])
     ORDER BY table_name ASC`,
    [ALLOWED_TABLES],
  );

  return result.rows.map((row) => row.table_name);
};

export const getTableColumns = async (
  table: string,
): Promise<Array<{ name: string; dataType: string; isNullable: boolean }>> => {
  const safeTable = assertTable(table);
  const result = await pool.query<{
    column_name: string;
    data_type: string;
    is_nullable: string;
  }>(
    `SELECT column_name, data_type, is_nullable
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = $1
     ORDER BY ordinal_position ASC`,
    [safeTable],
  );

  return result.rows.map((row) => ({
    name: row.column_name,
    dataType: row.data_type,
    isNullable: row.is_nullable.toUpperCase() === 'YES',
  }));
};

export const queryTable = async (
  table: string,
  params: { page?: number; limit?: number; search?: string; from?: string; to?: string },
): Promise<{
  items: Record<string, unknown>[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> => {
  const safeTable = assertTable(table);
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.max(1, Math.min(params.limit ?? 20, 100));
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (params.search) {
    conditions.push(`CAST(t AS text) ILIKE $${idx++}`);
    values.push(`%${params.search}%`);
  }

  const hasCreatedAt = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema='public'
         AND table_name=$1
         AND column_name='created_at'
     )`,
    [safeTable],
  );

  if (hasCreatedAt.rows[0]?.exists) {
    if (params.from) {
      conditions.push(`t.created_at >= $${idx++}`);
      values.push(params.from);
    }
    if (params.to) {
      conditions.push(`t.created_at <= $${idx++}`);
      values.push(params.to);
    }
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderBy = hasCreatedAt.rows[0]?.exists ? 'ORDER BY t.created_at DESC' : 'ORDER BY 1 DESC';

  const countResult = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text as total FROM ${safeTable} t ${where}`,
    values,
  );
  const total = Number.parseInt(countResult.rows[0]?.total ?? '0', 10);

  const rowsResult = await pool.query<Record<string, unknown>>(
    `SELECT t.* FROM ${safeTable} t ${where} ${orderBy} LIMIT $${idx++} OFFSET $${idx}`,
    [...values, limit, offset],
  );

  return {
    items: rowsResult.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  };
};

export const getSystemSettings = async (): Promise<
  Array<{ key: string; value: unknown; description: string | null }>
> => {
  const result = await pool.query<{
    key: string;
    value: unknown;
    description: string | null;
  }>('SELECT key, value, description FROM system_settings ORDER BY key ASC');

  return result.rows;
};

export const updateSystemSetting = async (
  key: string,
  value: unknown,
): Promise<{ key: string; value: unknown; description: string | null } | null> => {
  const result = await pool.query<{
    key: string;
    value: unknown;
    description: string | null;
  }>(
    `UPDATE system_settings
     SET value = $2::jsonb, updated_at = NOW()
     WHERE key = $1
     RETURNING key, value, description`,
    [key, JSON.stringify(value)],
  );

  return result.rows[0] ?? null;
};
