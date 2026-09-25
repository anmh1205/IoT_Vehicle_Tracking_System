import * as fs from 'node:fs';
import * as path from 'node:path';

import * as firmwareRepo from '@/domain/firmware/repositories/firmware.repository';
import * as deviceCommandService from '@/domain/device/services/device-command.service';
import { appConfig, firmwareConfig } from '@/config/env';
import { createNotFoundError, createValidationError } from '@/shared/utils/errors.util';
import { publishEvent } from '@/infrastructure/realtime';
import { logger } from '@/infrastructure/logger';
import {
  OTA_IN_PROGRESS_STATES,
  OTA_TERMINAL_STATES,
  type OtaRawState,
  type OtaSummaryState,
} from '@/domain/firmware/constants/ota-lifecycle.constants';
import type {
  Firmware,
  FirmwareDeploymentRow,
  FirmwareDeploymentView,
} from '@/domain/firmware/types/firmware.types';

const OTA_CONFIRM_TIMEOUT_DEFAULT_SEC = 180;
const OTA_CONFIRM_TIMEOUT_MIN_SEC = 60;
const OTA_CONFIRM_TIMEOUT_MAX_SEC = 3600;

const OTA_PROGRESS_TIMEOUT_REASON = 'progress_timeout';
const OTA_ASSIGNED_TIMEOUT_REASON = 'assigned_timeout';
const OTA_CONFIRM_TIMEOUT_REASON = 'confirm_timeout';

const sanitizeDeviceIds = (deviceIds: string[]): string[] => {
  const seen = new Set<string>();
  const sanitized: string[] = [];

  for (const raw of deviceIds) {
    if (typeof raw !== 'string') {
      continue;
    }

    const candidate = raw.trim();
    if (!candidate || seen.has(candidate)) {
      continue;
    }
    seen.add(candidate);
    sanitized.push(candidate);
  }

  return sanitized;
};

const clampConfirmTimeoutSec = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return OTA_CONFIRM_TIMEOUT_DEFAULT_SEC;
  }

  return Math.min(
    OTA_CONFIRM_TIMEOUT_MAX_SEC,
    Math.max(OTA_CONFIRM_TIMEOUT_MIN_SEC, Math.floor(parsed)),
  );
};

const normalizeArtifactSha = (sha256: string): string => sha256.trim().toLowerCase();

const parsePublicBaseUrl = (): URL => {
  const raw = firmwareConfig.publicBaseUrl?.trim();
  if (!raw) {
    throw createValidationError('FIRMWARE_PUBLIC_BASE_URL is not configured for OTA deploy');
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw createValidationError('FIRMWARE_PUBLIC_BASE_URL is invalid');
  }

  if (appConfig.nodeEnv !== 'development' && parsed.protocol !== 'https:') {
    throw createValidationError('FIRMWARE_PUBLIC_BASE_URL must use HTTPS outside development');
  }

  return parsed;
};

export const buildFirmwareDownloadUrl = (firmwareId: number): string => {
  const baseUrl = parsePublicBaseUrl();
  const pathname = baseUrl.pathname.endsWith('/')
    ? `${baseUrl.pathname}api/v1/firmware/${firmwareId}/download`
    : `${baseUrl.pathname}/api/v1/firmware/${firmwareId}/download`;
  baseUrl.pathname = pathname.replace(/\/{2,}/g, '/');
  return baseUrl.toString();
};

export interface FirmwareArtifactDescriptor {
  id: number;
  version: string;
  filename: string;
  resolvedPath: string;
  size: number;
  sha256: string;
}

const assertFirmwareArtifactReady = (firmware: Firmware): FirmwareArtifactDescriptor => {
  const resolvedPath = path.resolve(firmware.file_path);
  if (!fs.existsSync(resolvedPath)) {
    throw createNotFoundError('Firmware artifact not found on storage');
  }

  const stat = fs.statSync(resolvedPath);
  if (!stat.isFile()) {
    throw createValidationError('Firmware artifact path is not a regular file');
  }

  const expectedSize = Number(firmware.size);
  if (!Number.isFinite(expectedSize) || expectedSize <= 0) {
    throw createValidationError('Firmware artifact metadata has invalid size');
  }

  if (stat.size !== expectedSize) {
    throw createValidationError('Firmware artifact size mismatch');
  }

  const normalizedSha = normalizeArtifactSha(firmware.sha256);
  if (!/^[a-f0-9]{64}$/u.test(normalizedSha)) {
    throw createValidationError('Firmware artifact metadata has invalid sha256');
  }

  return {
    id: firmware.id,
    version: firmware.version,
    filename: firmware.filename,
    resolvedPath,
    size: stat.size,
    sha256: normalizedSha,
  };
};

export const getFirmwareArtifactDescriptor = async (
  firmwareId: number,
): Promise<FirmwareArtifactDescriptor> => {
  const firmware = await firmwareRepo.findById(firmwareId);
  if (!firmware) {
    throw createNotFoundError('Firmware not found');
  }

  return assertFirmwareArtifactReady(firmware);
};

const isTimedOut = (
  timeValue: Date | null | undefined,
  timeoutMs: number,
  nowMs: number,
): boolean => {
  if (!timeValue) {
    return false;
  }

  return nowMs - timeValue.getTime() > timeoutMs;
};

const toDeploymentView = (item: FirmwareDeploymentRow, nowMs: number): FirmwareDeploymentView => {
  const rawStatus = item.status;
  const assignedTimeoutMs = firmwareConfig.assignedTimeoutSec * 1000;
  const inProgressTimeoutMs = firmwareConfig.inProgressTimeoutSec * 1000;
  const confirmTimeoutMs = Math.max(item.confirm_timeout_sec ?? 0, 1) * 1000;

  let summaryStatus: OtaSummaryState | string = rawStatus;
  let stuckReason: string | null = null;

  if (!OTA_TERMINAL_STATES.has(rawStatus as OtaRawState)) {
    if (rawStatus === 'assigned') {
      summaryStatus = 'assigned';

      const anchor = item.last_seen_at ?? item.command_dispatched_at ?? item.first_assigned_at;
      if (isTimedOut(anchor, assignedTimeoutMs, nowMs)) {
        summaryStatus = 'stuck_timeout';
        stuckReason = OTA_ASSIGNED_TIMEOUT_REASON;
      }
    } else if (OTA_IN_PROGRESS_STATES.has(rawStatus as OtaRawState)) {
      summaryStatus = 'in_progress';
      const anchor = item.last_seen_at ?? item.updated_at;
      const timeoutMs = rawStatus === 'confirming' ? confirmTimeoutMs : inProgressTimeoutMs;
      if (isTimedOut(anchor, timeoutMs, nowMs)) {
        summaryStatus = 'stuck_timeout';
        stuckReason =
          rawStatus === 'confirming' ? OTA_CONFIRM_TIMEOUT_REASON : OTA_PROGRESS_TIMEOUT_REASON;
      }
    }
  }

  return {
    id: item.id,
    jobId: item.job_id,
    deviceId: item.device_id,
    status: rawStatus,
    summaryStatus,
    progress: item.progress,
    targetVersion: item.target_version,
    currentVersion: item.current_version,
    partition: item.partition,
    startedAt: item.started_at?.toISOString() ?? null,
    completedAt: item.completed_at?.toISOString() ?? null,
    updatedAt: item.updated_at.toISOString(),
    firstAssignedAt: item.first_assigned_at?.toISOString() ?? null,
    commandDispatchedAt: item.command_dispatched_at?.toISOString() ?? null,
    lastSeenAt: item.last_seen_at?.toISOString() ?? null,
    lastSeqNo: item.last_seq_no,
    lastMessageId: item.last_message_id,
    lastBootId: item.last_boot_id,
    isStuck: summaryStatus === 'stuck_timeout',
    stuckReason,
    errorMessage: item.error_message,
    errorCode: item.status_reason_code,
  };
};

export const deployFirmware = async (
  firmwareId: number,
  input: {
    deviceIds: string[];
    strategy?: 'rolling' | 'all_at_once';
    confirmTimeoutSec?: number;
  },
) => {
  const firmware = await firmwareRepo.findById(firmwareId);
  if (!firmware) {
    throw createNotFoundError('Firmware not found');
  }

  const artifact = assertFirmwareArtifactReady(firmware);

  const sanitizedDeviceIds = sanitizeDeviceIds(input.deviceIds ?? []);
  if (sanitizedDeviceIds.length === 0) {
    throw createValidationError('deviceIds must contain at least one device');
  }

  const knownDeviceIds = await firmwareRepo.findExistingDeviceIds(sanitizedDeviceIds);
  const invalidDeviceIds = sanitizedDeviceIds.filter((deviceId) => !knownDeviceIds.has(deviceId));
  if (invalidDeviceIds.length > 0) {
    throw createValidationError('Unknown device IDs', {
      deviceIds: invalidDeviceIds.map((deviceId) => `Unknown deviceId: ${deviceId}`),
    });
  }

  const confirmTimeoutSec = clampConfirmTimeoutSec(input.confirmTimeoutSec);
  const activeDeployments = await firmwareRepo.findActiveDeploymentsByDeviceAndTargetVersion(
    sanitizedDeviceIds,
    firmware.version,
  );
  const nowMs = Date.now();

  const dedupedByDevice = new Map<string, FirmwareDeploymentRow>();
  for (const deployment of activeDeployments) {
    const derived = toDeploymentView(deployment, nowMs);
    if (derived.summaryStatus === 'stuck_timeout') {
      continue;
    }

    if (!dedupedByDevice.has(deployment.device_id)) {
      dedupedByDevice.set(deployment.device_id, deployment);
    }
  }

  const deviceIdsToCreate = sanitizedDeviceIds.filter((deviceId) => !dedupedByDevice.has(deviceId));
  const createdDeployments = await firmwareRepo.createDeployments(
    firmwareId,
    deviceIdsToCreate,
    firmware.version,
    confirmTimeoutSec,
  );

  const downloadUrl = buildFirmwareDownloadUrl(firmwareId);
  const dispatchedDeviceIds: string[] = [];
  const deploymentMap = new Map<string, FirmwareDeploymentRow>();

  for (const deployment of dedupedByDevice.values()) {
    deploymentMap.set(deployment.device_id, deployment);
  }

  for (const deployment of createdDeployments) {
    try {
      await deviceCommandService.sendCommand(deployment.device_id, {
        command: 'ota_update',
        params: {
          jobId: deployment.job_id,
          version: artifact.version,
          url: downloadUrl,
          size: artifact.size,
          sha256: artifact.sha256,
          force: false,
          confirmTimeoutSec,
        },
      });
      dispatchedDeviceIds.push(deployment.device_id);
    } catch (error) {
      const reasonMessage =
        error instanceof Error ? error.message : 'MQTT dispatch failed for ota_update';
      await firmwareRepo.markDeploymentDispatchFailed(
        deployment.id,
        'dispatch_failed',
        reasonMessage,
      );
      deployment.status = 'failed';
      deployment.status_reason_code = 'dispatch_failed';
      deployment.error_message = reasonMessage;
      deployment.completed_at = new Date();
      deployment.last_seen_at = new Date();
      deployment.updated_at = new Date();
    }

    deploymentMap.set(deployment.device_id, deployment);
  }

  const targetedDeviceIds = Array.from(
    new Set([...dedupedByDevice.keys(), ...dispatchedDeviceIds]),
  );
  if (targetedDeviceIds.length > 0) {
    try {
      await firmwareRepo.setDeviceTargetFirmwareVersion(targetedDeviceIds, firmware.version);
    } catch (error) {
      // OTA commands may already be on the wire; inventory reconciliation must
      // not misreport dispatch as failed just because the desired-state mirror failed.
      logger.error('Failed to update device target firmware inventory', {
        error,
        firmwareId,
        targetVersion: firmware.version,
        deviceIds: targetedDeviceIds,
      });
    }
  }

  if (dispatchedDeviceIds.length > 0) {
    publishEvent('firmware:assignment', {
      firmware_id: firmwareId,
      device_ids: dispatchedDeviceIds,
      status: 'assigned',
    });
  }

  const deploymentViews = Array.from(deploymentMap.values()).map((item) =>
    toDeploymentView(item, nowMs),
  );

  return {
    firmwareId,
    strategy: input.strategy ?? 'rolling',
    totalDevices: sanitizedDeviceIds.length,
    dispatchedDevices: dispatchedDeviceIds.length,
    deduplicatedDevices: dedupedByDevice.size,
    confirmTimeoutSec,
    deployments: deploymentViews,
  };
};

export const getDeployments = async (firmwareId: number) => {
  const firmware = await firmwareRepo.findById(firmwareId);
  if (!firmware) {
    throw createNotFoundError('Firmware not found');
  }

  const deployments = await firmwareRepo.findDeploymentsByFirmwareId(firmwareId);
  const nowMs = Date.now();
  return deployments.map((item) => toDeploymentView(item, nowMs));
};
