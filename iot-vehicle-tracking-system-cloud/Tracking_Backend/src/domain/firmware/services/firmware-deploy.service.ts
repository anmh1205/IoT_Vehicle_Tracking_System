import * as firmwareRepo from '@/domain/firmware/repositories/firmware.repository';
import * as deviceCommandService from '@/domain/device/services/device-command.service';
import { firmwareConfig } from '@/config/env';
import { createNotFoundError, createValidationError } from '@/shared/utils/errors.util';
import { publishEvent } from '@/infrastructure/realtime';

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

  const deployments = await firmwareRepo.createDeployments(firmwareId, input.deviceIds, firmware.version);

  const buildDownloadUrl = (id: number) => {
    const baseUrl = firmwareConfig.publicBaseUrl?.replace(/\/$/, '');
    if (!baseUrl) {
      throw createValidationError('FIRMWARE_PUBLIC_BASE_URL is not configured for OTA deploy');
    }
    return `${baseUrl}/api/v1/firmware/${id}/download`;
  };

  for (const deployment of deployments) {
    await deviceCommandService.sendCommand(deployment.device_id, {
      command: 'ota_update',
      params: {
        jobId: deployment.job_id,
        version: firmware.version,
        url: buildDownloadUrl(firmwareId),
        size: firmware.size,
        sha256: firmware.sha256,
        force: false,
        confirmTimeoutSec: 180,
      },
    });
  }

  publishEvent('firmware.assignment.updated', {
    firmware_id: firmwareId,
    device_ids: deployments.map((d) => d.device_id),
    status: 'assigned',
  });

  return {
    firmwareId,
    strategy: input.strategy ?? 'rolling',
    totalDevices: deployments.length,
    deployments: deployments.map((item) => ({
      id: item.id,
      jobId: item.job_id,
      deviceId: item.device_id,
      status: item.status,
      progress: item.progress,
      targetVersion: item.target_version,
      currentVersion: item.current_version,
      partition: item.partition,
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
    jobId: item.job_id,
    deviceId: item.device_id,
    status: item.status,
    progress: item.progress,
    targetVersion: item.target_version,
    currentVersion: item.current_version,
    partition: item.partition,
    startedAt: item.started_at?.toISOString() ?? null,
    completedAt: item.completed_at?.toISOString() ?? null,
    errorMessage: item.error_message,
  }));
};
