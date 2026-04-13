import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

import type { Response } from 'express';
import { firmwareConfig } from '@/config/env';
import type { AuthenticatedRequest } from '@/shared/types/common.types';
import { asyncHandler } from '@/shared/utils/async-handler.util';
import { sendOk, sendCreated, sendError } from '@/shared/utils/response.util';
import { createApiError, createValidationError } from '@/shared/utils/errors.util';
import * as firmwareListService from '@/domain/firmware/services/firmware-list.service';
import * as firmwareUploadService from '@/domain/firmware/services/firmware-upload.service';
import * as firmwareActivateService from '@/domain/firmware/services/firmware-activate.service';
import * as firmwareDeleteService from '@/domain/firmware/services/firmware-delete.service';
import * as firmwareDeployService from '@/domain/firmware/services/firmware-deploy.service';

type FirmwareUploadRequest = AuthenticatedRequest & {
  file?: Express.Multer.File;
};

const computeSha256 = async (filePath: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });

const removeArtifactIfExists = async (filePath: string | undefined) => {
  if (!filePath || !fs.existsSync(filePath)) {
    return;
  }

  await fs.promises.unlink(filePath);
};

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

export const uploadFirmware = asyncHandler(async (req: FirmwareUploadRequest, res: Response) => {
  const version = String(req.body?.version ?? '').trim();
  const description =
    req.body?.description !== undefined ? String(req.body.description).trim() : undefined;
  const file = req.file;

  if (!version) {
    await removeArtifactIfExists(file?.path);
    throw createValidationError('Missing required field: version');
  }

  if (!file) {
    throw createValidationError('Missing required field: file');
  }

  const resolvedFilePath = path.resolve(file.path);
  const filename = String(file.originalname || file.filename);
  const sha256 = await computeSha256(resolvedFilePath);

  try {
    const firmware = await firmwareUploadService.createFirmware({
      version,
      filename,
      filePath: resolvedFilePath,
      size: file.size,
      sha256,
      description,
    });
    sendCreated(res, firmware);
  } catch (error) {
    await removeArtifactIfExists(resolvedFilePath);
    throw error;
  }
});

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
  const confirmTimeoutSec = req.body?.confirmTimeoutSec;
  const result = await firmwareDeployService.deployFirmware(id, {
    deviceIds,
    strategy,
    confirmTimeoutSec,
  });
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
      status: item.summaryStatus,
      progress: item.progress ?? 0,
      targetVersion: item.targetVersion,
      currentVersion: item.currentVersion,
      partition: item.partition,
      updatedAt: item.lastSeenAt ?? item.updatedAt,
      errorMessage: item.errorMessage,
      errorCode: item.errorCode,
      stuckReason: item.stuckReason,
    })),
  });
});

export const downloadFirmware = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid firmware ID');
  }

  const artifact = await firmwareDeployService.getFirmwareArtifactDescriptor(id);
  const filename = artifact.filename.endsWith('.bin') ? artifact.filename : `${artifact.filename}.bin`;
  const safeFilename = filename.replace(/["\r\n]/gu, '_');

  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Length', artifact.size.toString());
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('ETag', `"sha256-${artifact.sha256}"`);
  res.setHeader('Accept-Ranges', 'none');

  const stream = fs.createReadStream(artifact.resolvedPath);
  stream.on('error', (streamError) => {
    if (res.headersSent) {
      res.destroy(streamError as Error);
      return;
    }

    const error = createApiError(500, 'Failed to stream firmware artifact', {
      code: 'STREAM_ERROR',
      firmwareId: id,
    });
    sendError(res, error, req.path);
  });

  stream.pipe(res);
});
