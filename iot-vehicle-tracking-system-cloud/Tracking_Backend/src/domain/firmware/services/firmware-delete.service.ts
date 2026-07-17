import * as firmwareRepo from '@/domain/firmware/repositories/firmware.repository';
import { createNotFoundError } from '@/shared/utils/errors.util';

export const deleteFirmware = async (id: number): Promise<void> => {
  const fw = await firmwareRepo.findById(id);
  if (!fw) throw createNotFoundError('Firmware not found');

  await firmwareRepo.remove(id);
};
