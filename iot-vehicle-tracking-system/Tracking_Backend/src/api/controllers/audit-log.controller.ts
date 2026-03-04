import type { Response } from 'express';
import type { AuthenticatedRequest } from '@/shared/types/common.types';
import { asyncHandler } from '@/shared/utils/async-handler.util';
import { sendOk } from '@/shared/utils/response.util';
import { createValidationError } from '@/shared/utils/errors.util';
import { auditLogListQuerySchema } from '@/api/validators/audit-log.validator';
import * as auditLogService from '@/domain/audit/services/audit-log.service';

/** List audit logs — admin only */
export const listAuditLogs = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const parsed = auditLogListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw createValidationError('Invalid query parameters', parsed.error.flatten().fieldErrors);
  }

  const result = await auditLogService.listLogs(parsed.data);
  sendOk(res, result);
});
