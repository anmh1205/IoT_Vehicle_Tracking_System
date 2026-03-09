import * as firmwareRepo from '@/domain/firmware/repositories/firmware.repository';
import type {
  Firmware,
  FirmwarePublic,
  FirmwareListQuery,
} from '@/domain/firmware/types/firmware.types';
import { createNotFoundError } from '@/shared/utils/errors.util';

const sanitizeFirmware = (fw: Firmware): FirmwarePublic => ({
  id: fw.id,
  version: fw.version,
  filename: fw.filename,
  filePath: fw.file_path,
  size: fw.size,
  description: fw.description,
  isActive: fw.is_active,
  createdAt: fw.created_at.toISOString(),
});

export const listFirmware = async (
  query: FirmwareListQuery,
): Promise<{ firmwares: FirmwarePublic[]; total: number; page: number; limit: number }> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  const result = await firmwareRepo.findAll(query);

  return {
    firmwares: result.firmwares.map(sanitizeFirmware),
    total: result.total,
    page,
    limit,
  };
};

export const getFirmwareById = async (id: number): Promise<FirmwarePublic> => {
  const fw = await firmwareRepo.findById(id);
  if (!fw) throw createNotFoundError('Firmware not found');
  return sanitizeFirmware(fw);
};
