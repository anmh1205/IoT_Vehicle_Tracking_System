import * as firmwareRepo from '@/domain/firmware/repositories/firmware.repository';
import type { FirmwarePublic } from '@/domain/firmware/types/firmware.types';
import { createNotFoundError } from '@/shared/utils/errors.util';

const toPublic = (fw: {
  id: number;
  version: string;
  filename: string;
  size: number;
  description: string | null;
  is_active: boolean;
  created_at: Date;
}): FirmwarePublic => ({
  id: fw.id,
  version: fw.version,
  filename: fw.filename,
  size: fw.size,
  description: fw.description,
  isActive: fw.is_active,
  createdAt: fw.created_at.toISOString(),
});

export const activateFirmware = async (id: number): Promise<FirmwarePublic> => {
  const fw = await firmwareRepo.activate(id);
  if (!fw) throw createNotFoundError('Firmware not found');
  return toPublic(fw);
};

export const deactivateFirmware = async (id: number): Promise<FirmwarePublic> => {
  const fw = await firmwareRepo.deactivate(id);
  if (!fw) throw createNotFoundError('Firmware not found');
  return toPublic(fw);
};
