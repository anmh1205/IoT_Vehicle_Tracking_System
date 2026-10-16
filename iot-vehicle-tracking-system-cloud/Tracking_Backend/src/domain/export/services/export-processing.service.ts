import * as exportRepo from '@/domain/export/repositories/export.repository';
import { pool } from '@/infrastructure/database/pool';
import { rm } from 'node:fs/promises';
import { generateExcelFile } from '@/domain/export/services/export-file.service';
import { publishEvent } from '@/infrastructure/realtime';
import { createLogger } from '@/infrastructure/logger';
import type { ExportJob } from '@/domain/export/types/export.types';

const log = createLogger('export-processing');

const publishExportProgress = (
  job: ExportJob,
  progress: number,
  status: 'pending' | 'processing' | 'completed' | 'failed',
): void => {
  publishEvent('export:progress', {
    id: job.id,
    user_id: job.user_id,
    progress,
    status,
  });
};


/**
 * A PostgreSQL advisory lock lives on a dedicated client for the entire job.
 * On process kill/Postgres disconnection it is released automatically, so
 * startup recovery can safely reclaim 'processing' jobs without duplicating
 * work across concurrently running backend processes.
 */
export const processExport = async (job: ExportJob): Promise<void> => {
  const client = await pool.connect();
  let locked = false;
  let generatedFile: string | null = null;
  try {
    const lock = await client.query<{ locked: boolean }>(
      'SELECT pg_try_advisory_lock($1::integer, $2::integer) AS locked',
      [82401, job.id],
    );
    if (!lock.rows[0]?.locked) return;
    locked = true;

    const current = await exportRepo.findById(job.id);
    if (!current || current.status === 'completed' || current.status === 'failed') return;

    // Filter scope is a security boundary, not optional UI metadata. A malformed
    // filter must never fall back to the unfiltered full-fleet export path.
    const scopedDeviceId = current.filters?.deviceId;
    const scoped = current.filters !== null;
    const validScoped = scoped &&
      current.export_type === 'devices' &&
      typeof scopedDeviceId === 'string' &&
      Object.keys(current.filters!).length === 1 &&
      /^[A-Za-z0-9._:-]{1,96}$/.test(scopedDeviceId);

    const authorized = scoped
      ? Boolean(validScoped && await exportRepo.hasActiveDeviceGrantOwner(current.user_id, scopedDeviceId as string))
      : await exportRepo.hasPrivilegedActiveOwner(current.user_id);
    if (!authorized) {
      await exportRepo.updateStatus(current.id, 'failed');
      publishExportProgress(current, 100, 'failed');
      log.warn('Export rejected: owner grant revoked or filter scope invalid', { jobId: current.id });
      return;
    }

    log.info('Processing authorized export job', { jobId: current.id, type: current.export_type });
    try {
      await exportRepo.updateStatus(current.id, 'processing');
      publishExportProgress(current, 10, 'processing');
      generatedFile = await generateExcelFile(current.export_type, current.id,
        validScoped ? { deviceId: scopedDeviceId as string, userId: current.user_id } : undefined);
      publishExportProgress(current, 90, 'processing');

      const committed = await exportRepo.updateStatus(current.id, 'completed', generatedFile);
      if (!committed) throw new Error('Export job disappeared before completion');

      publishExportProgress(current, 100, 'completed');
      publishEvent('export:ready', {
        id: current.id, user_id: current.user_id, file_path: generatedFile,
        status: 'completed',
      });
      log.info('Export job completed', { jobId: current.id });
      generatedFile = null; // Job now owns the complete downloadable file.
    } catch (error) {
      log.error('Export job processing failed', { jobId: current.id, error });
      if (generatedFile !== null) {
        await rm(generatedFile, { force: true }).catch((cleanupError: unknown) => {
          log.error('Incomplete export cleanup failed', { jobId: current.id, cleanupError });
        });
      }
      // A database outage must leave the unfinished job recoverable rather
      // than falsely claiming it failed and dropping it from the retry scan.
      await exportRepo.updateStatus(current.id, 'failed');
      publishExportProgress(current, 100, 'failed');
      publishEvent('export:ready', {
        id: current.id, user_id: current.user_id, file_path: '', status: 'failed',
      });
    }
  } finally {
    if (locked) {
      try {
        await client.query('SELECT pg_advisory_unlock($1::integer, $2::integer)', [82401, job.id]);
      } catch (error) {
        log.error('Could not release export advisory lock', { jobId: job.id, error });
      }
    }
    client.release();
  }
};
