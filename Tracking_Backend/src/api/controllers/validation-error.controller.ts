import type { Response } from 'express';
import type { AuthenticatedRequest } from '@/shared/types/common.types';
import { asyncHandler } from '@/shared/utils/async-handler.util';
import { sendOk } from '@/shared/utils/response.util';
import { createValidationError } from '@/shared/utils/errors.util';
import { validationErrorListQuerySchema } from '@/api/validators/validation-error.validator';
import * as validationErrorService from '@/domain/validation-error/services/validation-error.service';

export const listValidationErrors = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const parsed = validationErrorListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw createValidationError('Invalid query parameters', parsed.error.flatten().fieldErrors);
  }

  const result = await validationErrorService.getValidationErrors({
    deviceId: parsed.data.device_id,
    validationType: parsed.data.validation_type,
    page: parsed.data.page,
    limit: parsed.data.limit,
  });

  sendOk(res, result);
});
