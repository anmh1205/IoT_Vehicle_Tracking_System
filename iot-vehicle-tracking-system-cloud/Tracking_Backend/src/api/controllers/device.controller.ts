import type { Response } from 'express';
import type { AuthenticatedRequest } from '@/shared/types/common.types';
import { asyncHandler } from '@/shared/utils/async-handler.util';
import { sendOk, sendCreated, sendAccepted } from '@/shared/utils/response.util';
import { createValidationError } from '@/shared/utils/errors.util';
import {
  createDeviceSchema,
  updateDeviceSchema,
  deviceListQuerySchema,
  sendDeviceCommandSchema,
} from '@/api/validators/device.validator';
import * as deviceCrudService from '@/domain/device/services/device-crud.service';
import * as deviceListService from '@/domain/device/services/device-list.service';
import * as deviceDetailsService from '@/domain/device/services/device-details.service';
import * as deviceSessionsService from '@/domain/device/services/device-sessions.service';
import * as deviceRuntimeService from '@/domain/device/services/device-runtime.service';
import * as deviceTelemetryService from '@/domain/device/services/device-telemetry.service';
import * as deviceCommandService from '@/domain/device/services/device-command.service';
import * as deviceErrorService from '@/domain/device/services/device-error.service';
import * as deviceEventLogService from '@/domain/device/services/device-event-log.service';
import * as firmwareDeployService from '@/domain/firmware/services/firmware-deploy.service';

const resolveDeviceId = async (rawId: string): Promise<string> => {
  const parsed = Number.parseInt(rawId, 10);
  if (!Number.isNaN(parsed)) {
    const device = await deviceDetailsService.getDeviceDetail(parsed);
    return device.deviceId;
  }
  return rawId;
};

export const listDevices = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const parsed = deviceListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw createValidationError('Invalid query parameters', parsed.error.flatten().fieldErrors);
  }

  const result = await deviceListService.listDevices(parsed.data, req.user);
  sendOk(res, result);
});

export const getDevice = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid device ID');
  }

  const device = await deviceDetailsService.getDeviceDetail(id);
  sendOk(res, device);
});

export const createDevice = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const parsed = createDeviceSchema.safeParse(req.body);
  if (!parsed.success) {
    throw createValidationError('Invalid device data', parsed.error.flatten().fieldErrors);
  }

  const device = await deviceCrudService.createDevice(parsed.data);
  sendCreated(res, device);
});

export const updateDevice = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid device ID');
  }

  const parsed = updateDeviceSchema.safeParse(req.body);
  if (!parsed.success) {
    throw createValidationError('Invalid device data', parsed.error.flatten().fieldErrors);
  }

  const device = await deviceCrudService.updateDevice(id, parsed.data);
  sendOk(res, device);
});

export const deleteDevice = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid device ID');
  }

  await deviceCrudService.deleteDevice(id);
  sendOk(res, { success: true });
});

export const getDeviceSessions = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const deviceId = await resolveDeviceId(req.params.id);
  const page = req.query.page ? Number.parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 20;

  const result = await deviceSessionsService.getDeviceSessions(deviceId, page, limit);
  sendOk(res, result);
});

export const getRuntimeStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const deviceId = await resolveDeviceId(req.params.id);
  const stats = await deviceRuntimeService.getRuntimeStats(deviceId);
  sendOk(res, stats);
});

export const getDevicePositions = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const positions = await deviceListService.getDevicePositions(req.user);
    sendOk(res, positions);
  },
);

export const regenerateToken = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid device ID');
  }

  const result = await deviceCrudService.regenerateToken(id);
  sendOk(res, result);
});

export const getTelemetry = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const deviceId = await resolveDeviceId(req.params.id);
  const metric = (req.query.metric as string | undefined) ?? 'imuAccelDeltaMps2';
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;

  const data = await deviceTelemetryService.getTelemetry(deviceId, { metric, from, to });
  sendOk(res, data);
});

export const getSessionTelemetry = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const deviceId = await resolveDeviceId(req.params.id);
  const sessionId = Number.parseInt(req.params.sessionId, 10);
  if (Number.isNaN(sessionId)) {
    throw createValidationError('Invalid session ID');
  }

  const data = await deviceTelemetryService.getSessionTelemetry(deviceId, sessionId);
  sendOk(res, data);
});

export const getEventLogs = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const deviceId = await resolveDeviceId(req.params.id);
  const page = req.query.page ? Number.parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 20;

  const result = await deviceEventLogService.listEventLogs(deviceId, page, limit);
  sendOk(res, result);
});

export const sendCommand = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const deviceId = await resolveDeviceId(req.params.id);
  const parsed = sendDeviceCommandSchema.safeParse(req.body);
  if (!parsed.success) {
    throw createValidationError('Invalid command payload', parsed.error.flatten().fieldErrors);
  }

  const result = await deviceCommandService.sendCommand(
    deviceId,
    {
      command: parsed.data.command,
      params: (parsed.data.params as Record<string, unknown> | undefined) ?? {},
    },
    { actorUserId: req.user?.id, correlationId: req.correlationId },
  );
  sendOk(res, result);
});

export const triggerOta = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const deviceId = await resolveDeviceId(req.params.id);
  const firmwareVersion = req.body?.firmwareVersion as string | undefined;

  if (!firmwareVersion) {
    throw createValidationError('Missing firmwareVersion');
  }

  const firmware = await firmwareDeployService.findFirmwareByVersion(firmwareVersion);
  if (!firmware) {
    throw createValidationError(`Firmware version ${firmwareVersion} not found`);
  }

  const result = await firmwareDeployService.deployFirmwareToDevice(
    firmware.id,
    deviceId,
    {
      force: req.body?.force === true,
      confirmTimeoutSec: req.body?.confirmTimeoutSec,
      actorUserId: req.user?.id,
      correlationId: req.correlationId,
    },
  );

  sendAccepted(res, result);
});

export const rollbackOta = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const deviceId = await resolveDeviceId(req.params.id);

  const result = await deviceCommandService.sendCommand(
    deviceId,
    {
      command: 'manual_rollback',
      params: {
        reason: req.body?.reason ?? 'manual_api',
      },
    },
    { actorUserId: req.user?.id, correlationId: req.correlationId },
  );

  sendAccepted(res, {
    status: 'rolled_back',
    commandId: result.id,
  });
});

export const importDevices = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const rows = Array.isArray(req.body?.devices) ? req.body.devices : [];
  if (rows.length === 0) {
    throw createValidationError('devices array is required');
  }

  let imported = 0;
  const errors: Array<{ row: number; error: string }> = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index] as Record<string, unknown>;
    try {
      const rawImei = row.imei == null ? '' : String(row.imei).trim();
      const candidate = {
        deviceId: String(row.deviceId ?? '').trim(),
        deviceName: String(row.deviceName ?? '').trim(),
        imei: rawImei || undefined,
      };

      const parsed = createDeviceSchema.safeParse(candidate);
      if (!parsed.success) {
        throw new Error(
          parsed.error.issues
            .map((issue) => `${issue.path.join('.') || 'row'}: ${issue.message}`)
            .join('; '),
        );
      }

      await deviceCrudService.createDevice(parsed.data);
      imported += 1;
    } catch (error) {
      errors.push({ row: index + 1, error: (error as Error).message });
    }
  }

  sendOk(res, {
    imported,
    failed: errors.length,
    errors,
  });
});

export const getCommands = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const deviceId = await resolveDeviceId(req.params.id);
  const page = req.query.page ? Number.parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 20;

  const result = await deviceCommandService.listCommands(deviceId, page, limit);
  sendOk(res, result);
});

export const getErrors = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const deviceId = await resolveDeviceId(req.params.id);
  const page = req.query.page ? Number.parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 20;

  const result = await deviceErrorService.listErrors(deviceId, page, limit);
  sendOk(res, result);
});
