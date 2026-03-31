import * as exportRepo from '@/domain/export/repositories/export.repository';
import { generateExcelFile } from '@/domain/export/services/export-file.service';
import { publishEvent } from '@/infrastructure/realtime';
import { createLogger } from '@/infrastructure/logger';
import type { ExportJob } from '@/domain/export/types/export.types';

const log = createLogger('export-processing');

export const processExport = async (job: ExportJob): Promise<void> => {
  log.info(`Processing export job #${job.id} (type: ${job.export_type})`);

  await exportRepo.updateStatus(job.id, 'processing');

  try {
    const filePath = await generateExcelFile(job.export_type, job.id);

    await exportRepo.updateStatus(job.id, 'completed', filePath);

    publishEvent('export:ready', {
      id: job.id,
      user_id: job.user_id,
      file_path: filePath,
      status: 'completed',
    });

    log.info(`Export job #${job.id} completed: ${filePath}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error(`Export job #${job.id} failed: ${message}`);

    await exportRepo.updateStatus(job.id, 'failed');

    publishEvent('export:ready', {
      id: job.id,
      user_id: job.user_id,
      file_path: '',
      status: 'failed',
    });
  }
};
