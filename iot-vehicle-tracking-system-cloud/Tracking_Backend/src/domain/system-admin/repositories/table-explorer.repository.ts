import { pool } from '@/infrastructure/database/pool';
import { createValidationError } from '@/shared/utils/errors.util';

/** System administrator's privileged PostgreSQL table browser.
 * Keep table whitelisting and sensitive-column redaction with SQL access. */

const ALLOWED_TABLES = [
  'users',
  'devices',
  'vehicles',
  'customers',
  'trips',
  'alerts',
  'geofences',
  'vehicle_zones',
  'gis_admin_units',
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

type TableColumnRow = {
  column_name: string;
  data_type: string;
  is_nullable: string;
  ordinal_position: number;
};

const SENSITIVE_COLUMNS_BY_TABLE: Partial<Record<AllowedTable, readonly string[]>> = {
  users: ['password_hash'],
  devices: ['auth_token'],
};

const SENSITIVE_COLUMN_RE =
  /(^|_)(api_?key|auth_?token|cookie|credential|password|private_?key|refresh_?token|secret|session_?token|token)(_|$)/iu;

const assertTable = (table: string): AllowedTable => {
  if (!ALLOWED_TABLES.includes(table as AllowedTable)) {
    throw createValidationError(`Table "${table}" is not allowed`);
  }
  return table as AllowedTable;
};

const quoteIdentifier = (identifier: string): string => `"${identifier.replace(/"/gu, '""')}"`;

const isSensitiveColumn = (table: AllowedTable, column: string): boolean => {
  const tableColumns = SENSITIVE_COLUMNS_BY_TABLE[table] ?? [];
  return tableColumns.includes(column) || SENSITIVE_COLUMN_RE.test(column);
};

const getVisibleTableColumns = async (table: AllowedTable): Promise<TableColumnRow[]> => {
  const result = await pool.query<TableColumnRow>(
    `SELECT column_name, data_type, is_nullable, ordinal_position
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = $1
     ORDER BY ordinal_position ASC`,
    [table],
  );

  return result.rows.filter((row) => !isSensitiveColumn(table, row.column_name));
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
  const columns = await getVisibleTableColumns(safeTable);

  return columns.map((row) => ({
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
  const visibleColumns = await getVisibleTableColumns(safeTable);

  if (visibleColumns.length === 0) {
    throw createValidationError(`Table "${safeTable}" has no visible columns`);
  }

  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (params.search) {
    const searchableFields = visibleColumns
      .map((column) => `t.${quoteIdentifier(column.column_name)}::text`)
      .join(', ');
    conditions.push(`concat_ws(' ', ${searchableFields}) ILIKE $${idx++}`);
    values.push(`%${params.search}%`);
  }

  const hasCreatedAt = visibleColumns.some((column) => column.column_name === 'created_at');

  if (hasCreatedAt) {
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
  const orderBy = hasCreatedAt ? 'ORDER BY t.created_at DESC' : 'ORDER BY 1 DESC';
  const safeTableSql = `public.${quoteIdentifier(safeTable)}`;
  const selectList = visibleColumns
    .map((column) => `t.${quoteIdentifier(column.column_name)}`)
    .join(', ');

  const countResult = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text as total FROM ${safeTableSql} t ${where}`,
    values,
  );
  const total = Number.parseInt(countResult.rows[0]?.total ?? '0', 10);

  const rowsResult = await pool.query<Record<string, unknown>>(
    `SELECT ${selectList} FROM ${safeTableSql} t ${where} ${orderBy} LIMIT $${idx++} OFFSET $${idx}`,
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

