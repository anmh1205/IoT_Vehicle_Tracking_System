import { randomUUID } from 'node:crypto';

import { pool } from '@/infrastructure/database/pool';
import {
  findOne,
  findMany,
  insertOne,
  updateOne,
  deleteOne,
} from '@/infrastructure/database/queries';
import type {
  Firmware,
  CreateFirmwareInput,
  FirmwareListQuery,
  FirmwareDeploymentRow,
} from '@/domain/firmware/types/firmware.types';

interface CountRow {
  count: string;
}

export const findAll = async (
  query: FirmwareListQuery,
): Promise<{ firmwares: Firmware[]; total: number }> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (query.isActive !== undefined) {
    conditions.push(`is_active = $${paramIndex++}`);
    params.push(query.isActive);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query<CountRow>(
    `SELECT COUNT(*)::text as count FROM firmware ${whereClause}`,
    params,
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const firmwares = await findMany<Firmware>(
    `SELECT * FROM firmware ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset],
  );

  return { firmwares, total };
};

export const findById = async (id: number): Promise<Firmware | null> =>
  findOne<Firmware>('SELECT * FROM firmware WHERE id = $1', [id]);

export const findByVersion = async (version: string): Promise<Firmware | null> =>
  findOne<Firmware>('SELECT * FROM firmware WHERE version = $1', [version]);

export const create = async (input: CreateFirmwareInput): Promise<Firmware> =>
  insertOne<Firmware>(
    `INSERT INTO firmware (version, filename, file_path, size, sha256, description, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, false, NOW(), NOW())
     RETURNING *`,
    [
      input.version,
      input.filename,
      input.filePath ?? input.filename,
      input.size,
      input.sha256,
      input.description ?? null,
    ],
  );

export const update = async (
  id: number,
  data: Partial<CreateFirmwareInput>,
): Promise<Firmware | null> => {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.version !== undefined) {
    setClauses.push(`version = $${paramIndex++}`);
    values.push(data.version);
  }
  if (data.filename !== undefined) {
    setClauses.push(`filename = $${paramIndex++}`);
    values.push(data.filename);
  }
  if (data.filePath !== undefined) {
    setClauses.push(`file_path = $${paramIndex++}`);
    values.push(data.filePath);
  }
  if (data.size !== undefined) {
    setClauses.push(`size = $${paramIndex++}`);
    values.push(data.size);
  }
  if (data.sha256 !== undefined) {
    setClauses.push(`sha256 = $${paramIndex++}`);
    values.push(data.sha256);
  }
  if (data.description !== undefined) {
    setClauses.push(`description = $${paramIndex++}`);
    values.push(data.description);
  }

  if (setClauses.length === 0) return findById(id);

  setClauses.push('updated_at = NOW()');
  values.push(id);

  return updateOne<Firmware>(
    `UPDATE firmware SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values,
  );
};

export const remove = async (id: number): Promise<boolean> =>
  deleteOne('DELETE FROM firmware WHERE id = $1', [id]);

export const activate = async (id: number): Promise<Firmware | null> =>
  updateOne<Firmware>(
    'UPDATE firmware SET is_active = true, updated_at = NOW() WHERE id = $1 RETURNING *',
    [id],
  );

export const deactivate = async (id: number): Promise<Firmware | null> =>
  updateOne<Firmware>(
    'UPDATE firmware SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING *',
    [id],
  );

export const createDeployments = async (
  firmwareId: number,
  deviceIds: string[],
  targetVersion: string,
  confirmTimeoutSec: number,
): Promise<FirmwareDeploymentRow[]> => {
  if (deviceIds.length === 0) {
    return [];
  }

  const values: unknown[] = [];
  const rowsSql: string[] = [];
  let paramIndex = 1;

  for (const deviceId of deviceIds) {
    const jobId = `ota_${Date.now()}_${randomUUID().slice(0, 8)}`;
    rowsSql.push(
      `(
        $${paramIndex++},
        $${paramIndex++},
        $${paramIndex++},
        'assigned',
        0,
        $${paramIndex++},
        NOW(),
        NOW(),
        NOW(),
        $${paramIndex++},
        NOW(),
        NOW(),
        NOW()
      )`,
    );
    values.push(jobId, deviceId, firmwareId, targetVersion, confirmTimeoutSec);
  }

  return findMany<FirmwareDeploymentRow>(
    `INSERT INTO firmware_update_log (
      job_id,
      device_id,
      firmware_id,
      status,
      progress,
      target_version,
      first_assigned_at,
      command_dispatched_at,
      last_seen_at,
      confirm_timeout_sec,
      started_at,
      created_at,
      updated_at
    )
     VALUES ${rowsSql.join(', ')}
     RETURNING *`,
    values,
  );
};

export const setDeviceTargetFirmwareVersion = async (
  deviceIds: string[],
  targetVersion: string,
): Promise<void> => {
  if (deviceIds.length === 0) {
    return;
  }

  await pool.query(
    `UPDATE devices
     SET target_firmware_version = $2,
         updated_at = NOW()
     WHERE device_id = ANY($1::text[])`,
    [deviceIds, targetVersion],
  );
};

export const findExistingDeviceIds = async (deviceIds: string[]): Promise<Set<string>> => {
  if (deviceIds.length === 0) {
    return new Set<string>();
  }

  const rows = await findMany<{ device_id: string }>(
    `SELECT device_id
     FROM devices
     WHERE device_id = ANY($1::text[])`,
    [deviceIds],
  );

  return new Set(rows.map((row) => row.device_id));
};

export const findActiveDeploymentsByDeviceAndTargetVersion = async (
  deviceIds: string[],
  targetVersion: string,
): Promise<FirmwareDeploymentRow[]> => {
  if (deviceIds.length === 0) {
    return [];
  }

  return findMany<FirmwareDeploymentRow>(
    `SELECT *
     FROM firmware_update_log
     WHERE device_id = ANY($1::text[])
       AND target_version = $2
       AND status NOT IN ('success', 'failed', 'rolled_back')
     ORDER BY updated_at DESC`,
    [deviceIds, targetVersion],
  );
};

export const markDeploymentDispatchFailed = async (
  deploymentId: number,
  reasonCode: string,
  reasonMessage: string,
): Promise<void> => {
  await pool.query(
    `UPDATE firmware_update_log
     SET status = 'failed',
         status_reason_code = $2,
         error_message = $3,
         progress = COALESCE(progress, 0),
         completed_at = NOW(),
         last_seen_at = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
    [deploymentId, reasonCode, reasonMessage],
  );
};

export const findDeploymentsByFirmwareId = async (
  firmwareId: number,
): Promise<FirmwareDeploymentRow[]> =>
  findMany<FirmwareDeploymentRow>(
    `SELECT * FROM firmware_update_log
     WHERE firmware_id = $1
     ORDER BY updated_at DESC`,
    [firmwareId],
  );

export const listLatestDeploymentsByDevice = async (
  deviceId: string,
  page: number,
  limit: number,
): Promise<{ items: FirmwareDeploymentRow[]; total: number }> => {
  const offset = (page - 1) * limit;

  const totalResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text as count
     FROM firmware_update_log
     WHERE device_id = $1`,
    [deviceId],
  );

  const items = await findMany<FirmwareDeploymentRow>(
    `SELECT *
     FROM firmware_update_log
     WHERE device_id = $1
     ORDER BY updated_at DESC
     LIMIT $2 OFFSET $3`,
    [deviceId, limit, offset],
  );

  return {
    items,
    total: parseInt(totalResult.rows[0].count, 10),
  };
};
