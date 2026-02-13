import * as firmwareRepo from '@/domain/firmware/repositories/firmware.repository';
import type { CreateFirmwareInput, FirmwarePublic } from '@/domain/firmware/types/firmware.types';
import { createConflictError } from '@/shared/utils/errors.util';

export const createFirmware = async (input: CreateFirmwareInput): Promise<FirmwarePublic> => {
  const existing = await firmwareRepo.findByVersion(input.version);
  if (existing) {
    throw createConflictError(`Firmware version "${input.version}" already exists`);
  }

  const fw = await firmwareRepo.create(input);

  return {
    id: fw.id,
    version: fw.version,
    filename: fw.filename,
    size: fw.size,
    description: fw.description,
    isActive: fw.is_active,
    createdAt: fw.created_at.toISOString(),
  };
};
