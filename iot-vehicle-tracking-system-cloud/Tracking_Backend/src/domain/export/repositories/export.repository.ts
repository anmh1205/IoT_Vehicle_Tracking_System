import { findOne, findMany, insertOne, updateOne } from '@/infrastructure/database/queries';
import type { ExportJob, CreateExportInput } from '@/domain/export/types/export.types';

export const findAll = async (userId: number): Promise<ExportJob[]> =>
  findMany<ExportJob>('SELECT * FROM export_jobs WHERE user_id = $1 ORDER BY created_at DESC', [
    userId,
  ]);

export const findById = async (id: number): Promise<ExportJob | null> =>
  findOne<ExportJob>('SELECT * FROM export_jobs WHERE id = $1', [id]);

export const create = async (userId: number, input: CreateExportInput): Promise<ExportJob> =>
  insertOne<ExportJob>(
    `INSERT INTO export_jobs (user_id, export_type, status, filters, created_at)
     VALUES ($1, $2, 'pending', $3, NOW())
     RETURNING *`,
    [userId, input.exportType, input.filters ? JSON.stringify(input.filters) : null],
  );

export const updateStatus = async (
  id: number,
  status: string,
  filePath?: string,
): Promise<ExportJob | null> => {
  if (filePath) {
    return updateOne<ExportJob>(
      `UPDATE export_jobs SET status = $1, file_path = $2, completed_at = NOW() WHERE id = $3 RETURNING *`,
      [status, filePath, id],
    );
  }

  return updateOne<ExportJob>(`UPDATE export_jobs SET status = $1 WHERE id = $2 RETURNING *`, [
    status,
    id,
  ]);
};

/** Crash-recoverable jobs remain in PostgreSQL, never in an in-memory queue. */
export const findRecoverable = async (limit = 25): Promise<ExportJob[]> =>
  findMany<ExportJob>(
    `SELECT * FROM export_jobs
     WHERE status IN ('pending', 'processing')
     ORDER BY created_at ASC, id ASC LIMIT $1`,
    [Math.min(Math.max(1, limit), 100)],
  );

/** A user can lose their global-export authority while a job is queued. */
export const hasPrivilegedActiveOwner = async (userId: number): Promise<boolean> => {
  const owner = await findOne<{ id: number }>(
    `SELECT id FROM users WHERE id = $1 AND status = 'active'
      AND role IN ('root', 'admin') LIMIT 1`,
    [userId],
  );
  return owner !== null;
};


/**
 * A scoped export requires an active manager/operator (or privileged user)
 * with a CURRENT explicit grant for this exact device. Never rely on a
 * previously cached deviceAccessMode claim for a PII export.
 */
export const hasActiveDeviceGrantOwner = async (userId: number, deviceId: string): Promise<boolean> => {
  const owner = await findOne<{ id: number }>(
    `SELECT u.id
     FROM users u
     JOIN user_device_access uda ON uda.user_id = u.id
     WHERE u.id = $1 AND u.status = 'active'
       AND u.role IN ('root', 'admin', 'manager', 'operator')
       AND uda.device_id = $2
     LIMIT 1`,
    [userId, deviceId],
  );
  return owner !== null;
};
