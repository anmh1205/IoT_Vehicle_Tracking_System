import type { Response } from 'express';
import type { AuthenticatedRequest } from '@/shared/types/common.types';
import { asyncHandler } from '@/shared/utils/async-handler.util';
import { sendOk } from '@/shared/utils/response.util';
import { createValidationError } from '@/shared/utils/errors.util';
import * as iotIngestionService from '@/domain/iot/services/iot-ingestion.service';

export const ingestData = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const payload = req.body as Partial<iotIngestionService.IotPayload>;
  if (!payload?.deviceId || !payload?.authToken || !payload?.data) {
    throw createValidationError('Missing required fields: deviceId, authToken, data');
  }

  const result = await iotIngestionService.ingestDeviceData({
    deviceId: payload.deviceId,
    authToken: payload.authToken,
    timestamp: payload.timestamp,
    data: payload.data,
  });

  sendOk(res, result);
});
