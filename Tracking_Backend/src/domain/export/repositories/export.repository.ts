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
