import * as fs from 'node:fs';
import * as path from 'node:path';

import type { Response } from 'express';
import { firmwareConfig } from '@/config/env';
import type { AuthenticatedRequest } from '@/shared/types/common.types';
import { asyncHandler } from '@/shared/utils/async-handler.util';
import { sendOk, sendCreated } from '@/shared/utils/response.util';
import { createNotFoundError, createValidationError } from '@/shared/utils/errors.util';
import * as firmwareListService from '@/domain/firmware/services/firmware-list.service';
import * as firmwareUploadService from '@/domain/firmware/services/firmware-upload.service';
import * as firmwareActivateService from '@/domain/firmware/services/firmware-activate.service';
import * as firmwareDeleteService from '@/domain/firmware/services/firmware-delete.service';
import * as firmwareDeployService from '@/domain/firmware/services/firmware-deploy.service';

export const listFirmware = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const query = {
    page: req.query.page ? Number.parseInt(req.query.page as string, 10) : undefined,
    limit: req.query.limit ? Number.parseInt(req.query.limit as string, 10) : undefined,
    isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
  };

  const result = await firmwareListService.listFirmware(query);
  sendOk(res, result);
});

export const getFirmware = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid firmware ID');
  }

  const firmware = await firmwareListService.getFirmwareById(id);
  sendOk(res, firmware);
});

export const createFirmware = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { version, filename, filePath, size, sha256, description } = req.body;

  if (!version || !filename || !size || !sha256) {
    throw createValidationError('Missing required fields: version, filename, size, sha256');
  }

  const resolvedFilePath = filePath
    ? String(filePath)
    : path.join(firmwareConfig.storagePath, String(filename));

  const firmware = await firmwareUploadService.createFirmware({
    version,
    filename,
    filePath: resolvedFilePath,
    size,
    sha256,
    description,
  });
  sendCreated(res, firmware);
});

export const uploadFirmware = createFirmware;

export const deleteFirmware = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid firmware ID');
  }

  await firmwareDeleteService.deleteFirmware(id);
  sendOk(res, { success: true });
});

export const activateFirmware = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid firmware ID');
  }

  const firmware = await firmwareActivateService.activateFirmware(id);
  sendOk(res, firmware);
});

export const deactivateFirmware = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid firmware ID');
  }

  const firmware = await firmwareActivateService.deactivateFirmware(id);
  sendOk(res, firmware);
});

export const deployFirmware = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid firmware ID');
  }

  const deviceIds = Array.isArray(req.body?.deviceIds) ? req.body.deviceIds : [];
  const strategy = req.body?.strategy as 'rolling' | 'all_at_once' | undefined;
  const result = await firmwareDeployService.deployFirmware(id, { deviceIds, strategy });
  sendOk(res, result);
});

export const assignFirmware = deployFirmware;

export const getDeployments = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid firmware ID');
  }

  const deployments = await firmwareDeployService.getDeployments(id);
  sendOk(res, deployments);
});

export const getAssignedDevices = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid firmware ID');
  }

  const deployments = await firmwareDeployService.getDeployments(id);
  sendOk(res, {
    devices: deployments.map((item) => ({
      jobId: item.jobId,
      deviceId: item.deviceId,
      status: item.status,
      progress: item.progress ?? 0,
      targetVersion: item.targetVersion,
      currentVersion: item.currentVersion,
      partition: item.partition,
      updatedAt: item.completedAt ?? item.startedAt,
      errorMessage: item.errorMessage,
    })),
  });
});

export const downloadFirmware = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid firmware ID');
  }

  const firmware = await firmwareListService.getFirmwareById(id);
  const filename = firmware.filename.endsWith('.bin')
    ? firmware.filename
    : `${firmware.filename}.bin`;
  const resolvedPath = path.resolve(firmware.filePath);

  if (!fs.existsSync(resolvedPath)) {
    throw createNotFoundError('Firmware artifact not found on storage');
  }

  const stat = fs.statSync(resolvedPath);
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Length', stat.size.toString());
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const stream = fs.createReadStream(resolvedPath);
  stream.on('error', () => {
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: {
          code: 'STREAM_ERROR',
          message: 'Failed to stream firmware artifact',
          status: 500,
          path: req.path,
        },
        timestamp: new Date().toISOString(),
      });
    }
  });

  stream.pipe(res);
});
