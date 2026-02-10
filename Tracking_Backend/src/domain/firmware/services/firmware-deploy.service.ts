import * as firmwareRepo from '@/domain/firmware/repositories/firmware.repository';
import { createNotFoundError, createValidationError } from '@/shared/utils/errors.util';

export const deployFirmware = async (
  firmwareId: number,
  input: { deviceIds: string[]; strategy?: 'rolling' | 'all_at_once' },
) => {
  const firmware = await firmwareRepo.findById(firmwareId);
  if (!firmware) {
    throw createNotFoundError('Firmware not found');
  }

  if (!input.deviceIds || input.deviceIds.length === 0) {
    throw createValidationError('deviceIds must contain at least one device');
  }

  const deployments = await firmwareRepo.createDeployments(firmwareId, input.deviceIds);

  return {
    firmwareId,
    strategy: input.strategy ?? 'rolling',
    totalDevices: deployments.length,
    deployments: deployments.map((item) => ({
      id: item.id,
      deviceId: item.device_id,
      status: item.status,
      startedAt: item.started_at?.toISOString() ?? null,
      completedAt: item.completed_at?.toISOString() ?? null,
      errorMessage: item.error_message,
    })),
  };
};

export const getDeployments = async (firmwareId: number) => {
  const firmware = await firmwareRepo.findById(firmwareId);
  if (!firmware) {
    throw createNotFoundError('Firmware not found');
  }

  const deployments = await firmwareRepo.findDeploymentsByFirmwareId(firmwareId);
  return deployments.map((item) => ({
    id: item.id,
    deviceId: item.device_id,
    status: item.status,
    startedAt: item.started_at?.toISOString() ?? null,
    completedAt: item.completed_at?.toISOString() ?? null,
    errorMessage: item.error_message,
  }));
};
