import { createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import { pool } from '@/infrastructure/database/pool';
import * as vmRepo from '@/domain/system-admin/repositories/victoriametrics.repository';
import * as vlRepo from '@/domain/system-admin/repositories/victorialogs.repository';
import {
  getSystemHealth as getCoreSystemHealth,
  type SystemHealthPayload,
} from '@/domain/system/services/system-status.service';
import {
  createConflictError,
  createNotFoundError,
  createValidationError,
} from '@/shared/utils/errors.util';
import { vmalertConfig, vmauthConfig } from '@/config/env';
import * as auditLogService from '@/domain/audit/services/audit-log.service';
import type {
  SystemAdminLogsQueryInput,
  SystemAdminLogsQueryResult,
  SystemAdminMetricsQueryInput,
  SystemAdminMetricsQueryResult,
  VmSetting,
  VmSettingActivateInput,
  VmSettingCreateInput,
  VmSettingDeleteInput,
  VmSettingIdempotentResult,
  VmSettingResource,
  VmSettingRevision,
  VmSettingRollbackInput,
  VmSettingUpdateInput,
  VmSettingValidationResult,
} from '@/domain/system-admin/types/system-admin-vm-settings.types';

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

const toJsonString = (value: unknown): string => {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw createValidationError('Setting value must be JSON serializable');
  }
  return serialized;
};

const toIsoString = (value: Date | string | null): string | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return value;
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

type SystemSettingRow = {
  key: string;
  value: unknown;
  description: string | null;
  group_name: string;
  is_public: boolean;
  updated_at: Date | string | null;
};

type RevisionRow = {
  id: number;
  setting_key: string;
  revision: number;
  action: string;
  snapshot: {
    key: string;
    value: unknown;
    description: string | null;
    groupName: string;
    isPublic: boolean;
    updatedAt: string | null;
  };
  actor_user_id: number | null;
  created_at: Date | string;
};

const toVmSetting = (row: SystemSettingRow): VmSetting => ({
  key: row.key,
  value: row.value,
  description: row.description,
  groupName: row.group_name,
  isPublic: row.is_public,
  updatedAt: toIsoString(row.updated_at),
});

const DEFAULT_VM_GROUP = 'victoria_metrics';

const normalizeVmResource = (resource: VmSettingResource | undefined, key: string): VmSettingResource => {
  if (resource) {
    return resource;
  }
  const lowered = key.toLowerCase();
  if (lowered.includes('retention')) {
    return 'retention';
  }
  if (lowered.includes('tenant')) {
    return 'tenant';
  }
  if (lowered.includes('access') || lowered.includes('vmauth') || lowered.includes('auth')) {
    return 'access';
  }
  if (lowered.includes('rule') || lowered.includes('alert') || lowered.includes('recording')) {
    return 'rule';
  }
  if (lowered.includes('template') || lowered.includes('query')) {
    return 'query-template';
  }
  return 'datasource';
};

const toRequestHash = (action: string, payload: unknown): string =>
  createHash('sha256').update(`${action}:${JSON.stringify(payload)}`).digest('hex');

const withTransaction = async <T>(handler: (client: PoolClient) => Promise<T>): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await handler(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const getIdempotentResult = async <T>(
  client: PoolClient,
  action: string,
  idempotencyKey: string | undefined,
  requestPayload: unknown,
): Promise<VmSettingIdempotentResult<T> | null> => {
  if (!idempotencyKey) {
    return null;
  }

  const key = idempotencyKey.trim();
  if (!key) {
    throw createValidationError('Idempotency key cannot be empty');
  }

  const requestHash = toRequestHash(action, requestPayload);
  const found = await client.query<{
    action: string;
    request_hash: string;
    response_payload: T;
  }>(
    `SELECT action, request_hash, response_payload
     FROM system_admin_idempotency_keys
     WHERE idempotency_key = $1
     FOR UPDATE`,
    [key],
  );

  const row = found.rows[0];
  if (!row) {
    return null;
  }

  if (row.action !== action || row.request_hash !== requestHash) {
    throw createConflictError('Idempotency key already used with different payload');
  }

  const payload = row.response_payload as Record<string, unknown> | null;
  if (payload && typeof payload === 'object' && payload[IDEMPOTENCY_PENDING_FIELD] === true) {
    throw createConflictError('Idempotency request is currently being processed');
  }

  return {
    reused: true,
    data: row.response_payload,
  };
};

const IDEMPOTENCY_PENDING_FIELD = '__pending';

const reserveIdempotencyKey = async (
  client: PoolClient,
  action: string,
  idempotencyKey: string | undefined,
  requestPayload: unknown,
): Promise<void> => {
  if (!idempotencyKey) {
    return;
  }

  const key = idempotencyKey.trim();
  if (!key) {
    throw createValidationError('Idempotency key cannot be empty');
  }

  await client.query(
    `INSERT INTO system_admin_idempotency_keys (idempotency_key, action, request_hash, response_payload, created_at)
     VALUES ($1, $2, $3, $4::jsonb, NOW())`,
    [
      key,
      action,
      toRequestHash(action, requestPayload),
      toJsonString({ [IDEMPOTENCY_PENDING_FIELD]: true }),
    ],
  );
};

const storeIdempotentResult = async (
  client: PoolClient,
  action: string,
  idempotencyKey: string | undefined,
  requestPayload: unknown,
  responsePayload: unknown,
): Promise<void> => {
  if (!idempotencyKey) {
    return;
  }

  const key = idempotencyKey.trim();
  if (!key) {
    return;
  }

  const updated = await client.query(
    `UPDATE system_admin_idempotency_keys
     SET response_payload = $4::jsonb
     WHERE idempotency_key = $1
       AND action = $2
       AND request_hash = $3`,
    [key, action, toRequestHash(action, requestPayload), toJsonString(responsePayload)],
  );

  if ((updated.rowCount ?? 0) === 0) {
    throw createConflictError('Idempotency key state conflict');
  }
};

const isUniqueViolation = (error: unknown): boolean =>
  (error as { code?: string })?.code === '23505';

const getCurrentSetting = async (key: string): Promise<VmSetting | null> => {
  const result = await pool.query<SystemSettingRow>(
    `SELECT key, value, description, group_name, is_public, updated_at
     FROM system_settings
     WHERE key = $1`,
    [key],
  );

  const row = result.rows[0];
  return row ? toVmSetting(row) : null;
};

const getCurrentSettingForUpdate = async (client: PoolClient, key: string): Promise<VmSetting | null> => {
  const result = await client.query<SystemSettingRow>(
    `SELECT key, value, description, group_name, is_public, updated_at
     FROM system_settings
     WHERE key = $1
     FOR UPDATE`,
    [key],
  );

  const row = result.rows[0];
  return row ? toVmSetting(row) : null;
};

const getLatestRevisionNumber = async (client: PoolClient, key: string): Promise<number> => {
  const result = await client.query<{ revision: number | null }>(
    `SELECT MAX(revision)::int AS revision
     FROM system_admin_setting_revisions
     WHERE setting_key = $1`,
    [key],
  );

  return result.rows[0]?.revision ?? 0;
};

const assertExpectedRevision = async (
  client: PoolClient,
  key: string,
  expectedRevision: number | undefined,
): Promise<void> => {
  if (!expectedRevision) {
    return;
  }

  const current = await getLatestRevisionNumber(client, key);
  if (current !== expectedRevision) {
    throw createConflictError(`Stale revision: expected ${expectedRevision}, current ${current}`);
  }
};

const toRevisionSnapshot = (setting: VmSetting) => ({
  key: setting.key,
  value: setting.value,
  description: setting.description,
  groupName: setting.groupName,
  isPublic: setting.isPublic,
  updatedAt: setting.updatedAt,
});

const createRevision = async (
  client: PoolClient,
  key: string,
  action: VmSettingRevision['action'],
  snapshot: ReturnType<typeof toRevisionSnapshot>,
  actorUserId?: number,
): Promise<VmSettingRevision> => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const result = await client.query<RevisionRow>(
        `WITH next_revision AS (
           SELECT COALESCE(MAX(revision), 0) + 1 AS revision
           FROM system_admin_setting_revisions
           WHERE setting_key = $1
         )
         INSERT INTO system_admin_setting_revisions (setting_key, revision, action, snapshot, actor_user_id, created_at)
         SELECT $1, next_revision.revision, $2, $3::jsonb, $4, NOW()
         FROM next_revision
         RETURNING id, setting_key, revision, action, snapshot, actor_user_id, created_at`,
        [key, action, toJsonString(snapshot), actorUserId ?? null],
      );

      const row = result.rows[0];
      if (!row) {
        throw createValidationError(`Unable to create revision for setting "${key}"`);
      }

      return {
        id: String(row.id),
        settingKey: row.setting_key,
        revision: row.revision,
        action: row.action as VmSettingRevision['action'],
        snapshot: row.snapshot,
        actorUserId: row.actor_user_id,
        createdAt: toIsoString(row.created_at) ?? new Date().toISOString(),
      };
    } catch (error) {
      if ((error as { code?: string }).code === '23505' && attempt < 4) {
        continue;
      }
      throw error;
    }
  }

  throw createConflictError(`Unable to allocate revision for setting "${key}"`);
};

const recordVmAudit = async (
  client: PoolClient,
  action: string,
  settingKey: string,
  previousValue: unknown,
  nextValue: unknown,
  actorUserId?: number,
): Promise<void> => {
  if (!actorUserId) {
    return;
  }

  await auditLogService.record(
    {
      userId: actorUserId,
      action,
      entityType: 'system_admin_vm_setting',
      entityId: settingKey,
      changes: {
        value: { old: previousValue, new: nextValue },
      },
    },
    client,
    { strict: true },
  );
};

const getTenantCount = async (): Promise<number> => {
  const result = await pool.query<{ total: string }>('SELECT COUNT(*)::text AS total FROM customers');
  return Number.parseInt(result.rows[0]?.total ?? '0', 10);
};

const getRulePackCount = async (): Promise<number> => {
  const result = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total
     FROM system_settings
     WHERE group_name = $1
       AND key ILIKE '%rule%'`,
    [DEFAULT_VM_GROUP],
  );

  return Number.parseInt(result.rows[0]?.total ?? '0', 10);
};

const probeRuntimeHealth = async (baseUrl: string): Promise<boolean> => {
  if (!baseUrl || baseUrl.trim().length === 0) {
    return false;
  }

  try {
    const url = new URL('/-/healthy', baseUrl).toString();
    const response = await fetch(url, { method: 'GET' });
    return response.ok;
  } catch {
    return false;
  }
};

export const getSystemSettings = async (): Promise<VmSetting[]> => {
  const result = await pool.query<SystemSettingRow>(
    `SELECT key, value, description, group_name, is_public, updated_at
     FROM system_settings
     ORDER BY key ASC`,
  );

  return result.rows.map(toVmSetting);
};

export const listVmSettings = async (resource?: VmSettingResource): Promise<VmSetting[]> => {
  const settings = await getSystemSettings();
  if (!resource) {
    return settings.filter((setting) => setting.groupName === DEFAULT_VM_GROUP);
  }

  return settings.filter(
    (setting) =>
      setting.groupName === DEFAULT_VM_GROUP && normalizeVmResource(undefined, setting.key) === resource,
  );
};

export const createVmSetting = async (
  params: VmSettingCreateInput,
): Promise<VmSettingIdempotentResult<{ setting: VmSetting; revision: VmSettingRevision }>> => {
  const key = params.key.trim();
  if (!key) {
    throw createValidationError('SYSTEM_ADMIN_VM_SETTING_KEY_REQUIRED');
  }

  const groupName = (params.groupName ?? DEFAULT_VM_GROUP).trim();
  if (!groupName) {
    throw createValidationError('Setting group name is required');
  }

  const requestPayload = {
    key,
    value: params.value,
    description: params.description ?? null,
    groupName,
    isPublic: Boolean(params.isPublic),
    resource: normalizeVmResource(params.resource, key),
  };

  return withTransaction(async (client) => {
    const reused = await getIdempotentResult<{ setting: VmSetting; revision: VmSettingRevision }>(
      client,
      'create-vm-setting',
      params.idempotencyKey,
      requestPayload,
    );
    if (reused) {
      return reused;
    }

    try {
      await reserveIdempotencyKey(client, 'create-vm-setting', params.idempotencyKey, requestPayload);
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }
      const retry = await getIdempotentResult<{ setting: VmSetting; revision: VmSettingRevision }>(
        client,
        'create-vm-setting',
        params.idempotencyKey,
        requestPayload,
      );
      if (retry) {
        return retry;
      }
      throw createConflictError('Idempotency request is currently being processed');
    }

    try {
      const result = await client.query<SystemSettingRow>(
        `INSERT INTO system_settings (key, value, description, group_name, is_public, updated_at)
         VALUES ($1, $2::jsonb, $3, $4, $5, NOW())
         RETURNING key, value, description, group_name, is_public, updated_at`,
        [
          key,
          toJsonString(params.value),
          params.description?.trim() ? params.description.trim() : null,
          groupName,
          Boolean(params.isPublic),
        ],
      );

      const row = result.rows[0];
      if (!row) {
        throw createValidationError(`Unable to create setting "${key}"`);
      }

      const setting = toVmSetting(row);
      const revision = await createRevision(
        client,
        key,
        'create',
        toRevisionSnapshot(setting),
        params.actorUserId,
      );
      await recordVmAudit(
        client,
        'system_admin.vm_setting.create',
        key,
        null,
        setting.value,
        params.actorUserId,
      );

      const payload = { setting, revision };
      await storeIdempotentResult(
        client,
        'create-vm-setting',
        params.idempotencyKey,
        requestPayload,
        payload,
      );

      return {
        reused: false,
        data: payload,
      };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw createConflictError(`Setting "${key}" already exists`);
      }
      throw error;
    }
  });
};

export const updateVmSetting = async (
  params: VmSettingUpdateInput,
): Promise<VmSettingIdempotentResult<{ setting: VmSetting; revision: VmSettingRevision }> | null> => {
  const key = params.key.trim();
  if (!key) {
    throw createValidationError('SYSTEM_ADMIN_VM_SETTING_KEY_REQUIRED');
  }

  const requestPayload = {
    key,
    value: params.value,
    expectedRevision: params.expectedRevision,
    resource: normalizeVmResource(params.resource, key),
  };

  return withTransaction(async (client) => {
    const reused = await getIdempotentResult<{ setting: VmSetting; revision: VmSettingRevision }>(
      client,
      'update-vm-setting',
      params.idempotencyKey,
      requestPayload,
    );
    if (reused) {
      return reused;
    }

    const before = await getCurrentSettingForUpdate(client, key);
    if (!before) {
      return null;
    }

    await assertExpectedRevision(client, key, params.expectedRevision);

    try {
      await reserveIdempotencyKey(client, 'update-vm-setting', params.idempotencyKey, requestPayload);
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }
      const retry = await getIdempotentResult<{ setting: VmSetting; revision: VmSettingRevision }>(
        client,
        'update-vm-setting',
        params.idempotencyKey,
        requestPayload,
      );
      if (retry) {
        return retry;
      }
      throw createConflictError('Idempotency request is currently being processed');
    }

    const result = await client.query<SystemSettingRow>(
      `UPDATE system_settings
       SET value = $2::jsonb,
           updated_at = NOW()
       WHERE key = $1
       RETURNING key, value, description, group_name, is_public, updated_at`,
      [key, toJsonString(params.value)],
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    const setting = toVmSetting(row);
    const revision = await createRevision(
      client,
      key,
      'update',
      toRevisionSnapshot(setting),
      params.actorUserId,
    );
    await recordVmAudit(
      client,
      'system_admin.vm_setting.update',
      key,
      before.value,
      setting.value,
      params.actorUserId,
    );

    const payload = { setting, revision };
    await storeIdempotentResult(
      client,
      'update-vm-setting',
      params.idempotencyKey,
      requestPayload,
      payload,
    );

    return {
      reused: false,
      data: payload,
    };
  });
};

export const deleteVmSetting = async (
  params: VmSettingDeleteInput,
): Promise<VmSettingIdempotentResult<{ key: string; deleted: boolean; revision: VmSettingRevision }> | null> => {
  const key = params.key.trim();
  if (!key) {
    throw createValidationError('SYSTEM_ADMIN_VM_SETTING_KEY_REQUIRED');
  }

  const requestPayload = {
    key,
    expectedRevision: params.expectedRevision,
    resource: normalizeVmResource(params.resource, key),
  };

  return withTransaction(async (client) => {
    const reused = await getIdempotentResult<{ key: string; deleted: boolean; revision: VmSettingRevision }>(
      client,
      'delete-vm-setting',
      params.idempotencyKey,
      requestPayload,
    );
    if (reused) {
      return reused;
    }

    const before = await getCurrentSettingForUpdate(client, key);
    if (!before) {
      return null;
    }

    await assertExpectedRevision(client, key, params.expectedRevision);

    try {
      await reserveIdempotencyKey(client, 'delete-vm-setting', params.idempotencyKey, requestPayload);
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }
      const retry = await getIdempotentResult<{ key: string; deleted: boolean; revision: VmSettingRevision }>(
        client,
        'delete-vm-setting',
        params.idempotencyKey,
        requestPayload,
      );
      if (retry) {
        return retry;
      }
      throw createConflictError('Idempotency request is currently being processed');
    }

    const result = await client.query<{ key: string }>(
      `DELETE FROM system_settings
       WHERE key = $1
       RETURNING key`,
      [key],
    );

    if ((result.rowCount ?? 0) === 0) {
      return null;
    }

    const revision = await createRevision(
      client,
      key,
      'delete',
      toRevisionSnapshot(before),
      params.actorUserId,
    );
    await recordVmAudit(
      client,
      'system_admin.vm_setting.delete',
      key,
      before.value,
      null,
      params.actorUserId,
    );

    const payload = { key, deleted: true, revision };
    await storeIdempotentResult(
      client,
      'delete-vm-setting',
      params.idempotencyKey,
      requestPayload,
      payload,
    );

    return {
      reused: false,
      data: payload,
    };
  });
};

export const listVmSettingRevisions = async (
  key: string,
  limit = 20,
): Promise<VmSettingRevision[]> => {
  const settingKey = key.trim();
  if (!settingKey) {
    throw createValidationError('SYSTEM_ADMIN_VM_SETTING_KEY_REQUIRED');
  }

  const safeLimit = Math.max(1, Math.min(limit, 100));
  const result = await pool.query<RevisionRow>(
    `SELECT id, setting_key, revision, action, snapshot, actor_user_id, created_at
     FROM system_admin_setting_revisions
     WHERE setting_key = $1
     ORDER BY revision DESC
     LIMIT $2`,
    [settingKey, safeLimit],
  );

  return result.rows.map((row) => ({
    id: String(row.id),
    settingKey: row.setting_key,
    revision: row.revision,
    action: row.action as VmSettingRevision['action'],
    snapshot: row.snapshot,
    actorUserId: row.actor_user_id,
    createdAt: toIsoString(row.created_at) ?? new Date().toISOString(),
  }));
};

export const validateVmSetting = async (
  key: string,
  resource?: VmSettingResource,
): Promise<VmSettingValidationResult> => {
  const settingKey = key.trim();
  if (!settingKey) {
    throw createValidationError('SYSTEM_ADMIN_VM_SETTING_KEY_REQUIRED');
  }

  const setting = await getCurrentSetting(settingKey);
  if (!setting) {
    throw createNotFoundError('SYSTEM_ADMIN_VM_SETTING_NOT_FOUND');
  }

  const resolvedResource = normalizeVmResource(resource, settingKey);
  const warnings: string[] = [];
  const errors: string[] = [];

  if (resolvedResource === 'datasource') {
    if (typeof setting.value !== 'object' || setting.value === null) {
      warnings.push('Datasource value should be an object to include endpoint and auth metadata');
    }
  }

  if (resolvedResource === 'retention') {
    const rawValue = setting.value as { mode?: string; days?: number } | string;
    if (typeof rawValue === 'object' && rawValue !== null && rawValue.mode === 'hot-apply') {
      errors.push('Retention change must use deploy-window mode, hot-apply is not allowed');
    }
    if (typeof rawValue === 'string' && rawValue.toLowerCase().includes('hot-apply')) {
      errors.push('Retention change must use deploy-window mode, hot-apply is not allowed');
    }
  }

  const tenantCount = await getTenantCount();
  const rulePackCount = await getRulePackCount();

  if (resolvedResource === 'rule') {
    if (!vmalertConfig.url) {
      errors.push('VMALERT_URL is not configured');
    }

    const vmQueryHealthy = await vmRepo.query('up').then(() => true).catch(() => false);
    if (!vmQueryHealthy) {
      errors.push('VictoriaMetrics runtime query failed during full-tenant live validation');
    }

    const vmalertHealthy = await probeRuntimeHealth(vmalertConfig.url);
    if (!vmalertHealthy) {
      warnings.push('vmalert health probe failed; verify runtime before activation');
    }

    if (tenantCount === 0) {
      warnings.push('No tenant detected for full live validation');
    }
  }

  if (resolvedResource === 'access') {
    if (!vmauthConfig.url) {
      warnings.push('VMAUTH_URL is not configured; access-policy runtime sync may be incomplete');
    } else {
      const vmauthHealthy = await probeRuntimeHealth(vmauthConfig.url);
      if (!vmauthHealthy) {
        warnings.push('vmauth health probe failed; verify runtime before activation');
      }
    }
  }

  return {
    valid: errors.length === 0,
    resource: resolvedResource,
    warnings,
    errors,
    blastRadius: {
      affectsTenants: tenantCount,
      affectedRulePacks: rulePackCount,
    },
  };
};

export const activateVmSetting = async (
  params: VmSettingActivateInput,
): Promise<VmSettingIdempotentResult<{ setting: VmSetting; revision: VmSettingRevision }>> => {
  const key = params.key.trim();
  if (!key) {
    throw createValidationError('SYSTEM_ADMIN_VM_SETTING_KEY_REQUIRED');
  }

  const requestPayload = {
    key,
    expectedRevision: params.expectedRevision,
    resource: normalizeVmResource(params.resource, key),
  };

  const precheckedIdempotent = await withTransaction(async (client) =>
    getIdempotentResult<{ setting: VmSetting; revision: VmSettingRevision }>(
      client,
      'activate-vm-setting',
      params.idempotencyKey,
      requestPayload,
    ),
  );
  if (precheckedIdempotent) {
    return precheckedIdempotent;
  }

  const validation = await validateVmSetting(key, params.resource);
  if (!validation.valid) {
    throw createValidationError('SYSTEM_ADMIN_VM_ACTIVATION_VALIDATION_FAILED', {
      details: {
        errors: validation.errors,
        warnings: validation.warnings,
      },
    });
  }

  return withTransaction(async (client) => {
    const reused = await getIdempotentResult<{ setting: VmSetting; revision: VmSettingRevision }>(
      client,
      'activate-vm-setting',
      params.idempotencyKey,
      requestPayload,
    );
    if (reused) {
      return reused;
    }

    const before = await getCurrentSettingForUpdate(client, key);
    if (!before) {
      throw createNotFoundError('SYSTEM_ADMIN_VM_SETTING_NOT_FOUND');
    }

    await assertExpectedRevision(client, key, params.expectedRevision);

    try {
      await reserveIdempotencyKey(client, 'activate-vm-setting', params.idempotencyKey, requestPayload);
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }
      const retry = await getIdempotentResult<{ setting: VmSetting; revision: VmSettingRevision }>(
        client,
        'activate-vm-setting',
        params.idempotencyKey,
        requestPayload,
      );
      if (retry) {
        return retry;
      }
      throw createConflictError('Idempotency request is currently being processed');
    }

    const updated = await client.query<SystemSettingRow>(
      `UPDATE system_settings
       SET updated_at = NOW()
       WHERE key = $1
       RETURNING key, value, description, group_name, is_public, updated_at`,
      [key],
    );

    const row = updated.rows[0];
    if (!row) {
      throw createNotFoundError('SYSTEM_ADMIN_VM_SETTING_NOT_FOUND');
    }

    const setting = toVmSetting(row);
    const revision = await createRevision(
      client,
      key,
      'activate',
      toRevisionSnapshot(setting),
      params.actorUserId,
    );
    await recordVmAudit(
      client,
      'system_admin.vm_setting.activate',
      key,
      before.value,
      setting.value,
      params.actorUserId,
    );

    const payload = { setting, revision };
    await storeIdempotentResult(
      client,
      'activate-vm-setting',
      params.idempotencyKey,
      requestPayload,
      payload,
    );

    return {
      reused: false,
      data: payload,
    };
  });
};

export const rollbackVmSetting = async (
  params: VmSettingRollbackInput,
): Promise<VmSettingIdempotentResult<{ setting: VmSetting; revision: VmSettingRevision }>> => {
  const key = params.key.trim();
  if (!key) {
    throw createValidationError('SYSTEM_ADMIN_VM_SETTING_KEY_REQUIRED');
  }

  const requestPayload = {
    key,
    targetRevision: params.targetRevision,
    expectedRevision: params.expectedRevision,
  };

  return withTransaction(async (client) => {
    const reused = await getIdempotentResult<{ setting: VmSetting; revision: VmSettingRevision }>(
      client,
      'rollback-vm-setting',
      params.idempotencyKey,
      requestPayload,
    );
    if (reused) {
      return reused;
    }

    const before = await getCurrentSettingForUpdate(client, key);
    await assertExpectedRevision(client, key, params.expectedRevision);

    const target = await client.query<RevisionRow>(
      `SELECT id, setting_key, revision, action, snapshot, actor_user_id, created_at
       FROM system_admin_setting_revisions
       WHERE setting_key = $1 AND revision = $2`,
      [key, params.targetRevision],
    );

    const targetRow = target.rows[0];
    if (!targetRow) {
      throw createNotFoundError('SYSTEM_ADMIN_VM_TARGET_REVISION_NOT_FOUND');
    }

    const snapshot = targetRow.snapshot;

    try {
      await reserveIdempotencyKey(client, 'rollback-vm-setting', params.idempotencyKey, requestPayload);
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }
      const retry = await getIdempotentResult<{ setting: VmSetting; revision: VmSettingRevision }>(
        client,
        'rollback-vm-setting',
        params.idempotencyKey,
        requestPayload,
      );
      if (retry) {
        return retry;
      }
      throw createConflictError('Idempotency request is currently being processed');
    }

    const upsert = await client.query<SystemSettingRow>(
      `INSERT INTO system_settings (key, value, description, group_name, is_public, updated_at)
       VALUES ($1, $2::jsonb, $3, $4, $5, NOW())
       ON CONFLICT (key)
       DO UPDATE SET value = EXCLUDED.value,
                     description = EXCLUDED.description,
                     group_name = EXCLUDED.group_name,
                     is_public = EXCLUDED.is_public,
                     updated_at = NOW()
       RETURNING key, value, description, group_name, is_public, updated_at`,
      [
        key,
        toJsonString(snapshot.value),
        snapshot.description,
        snapshot.groupName,
        snapshot.isPublic,
      ],
    );

    const row = upsert.rows[0];
    if (!row) {
      throw createValidationError('Rollback failed to restore target revision');
    }

    const setting = toVmSetting(row);
    const revision = await createRevision(
      client,
      key,
      'rollback',
      toRevisionSnapshot(setting),
      params.actorUserId,
    );
    await recordVmAudit(
      client,
      'system_admin.vm_setting.rollback',
      key,
      before?.value ?? null,
      setting.value,
      params.actorUserId,
    );

    const payload = { setting, revision };
    await storeIdempotentResult(
      client,
      'rollback-vm-setting',
      params.idempotencyKey,
      requestPayload,
      payload,
    );

    return {
      reused: false,
      data: payload,
    };
  });
};

