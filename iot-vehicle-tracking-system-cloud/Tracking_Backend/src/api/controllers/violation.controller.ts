import type { Response } from 'express';
import type { AuthenticatedRequest } from '@/shared/types/common.types';
import { asyncHandler } from '@/shared/utils/async-handler.util';
import { sendOk, sendCreated } from '@/shared/utils/response.util';
import { createValidationError } from '@/shared/utils/errors.util';
import {
  createViolationSchema,
  acknowledgeViolationSchema,
  violationListQuerySchema,
} from '@/api/validators/violation.validator';
import * as violationCrudService from '@/domain/violation/services/violation-crud.service';
import * as violationListService from '@/domain/violation/services/violation-list.service';

export const listViolations = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const parsed = violationListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw createValidationError('Invalid query parameters', parsed.error.flatten().fieldErrors);
  }

  const result = await violationListService.listViolations(parsed.data);
  sendOk(res, result);
});

export const getViolation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw createValidationError('Invalid violation ID');
  }

  const violation = await violationCrudService.getViolationById(id);
  sendOk(res, violation);
});

export const createViolation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const parsed = createViolationSchema.safeParse(req.body);
  if (!parsed.success) {
    throw createValidationError('Invalid violation data', parsed.error.flatten().fieldErrors);
  }

  const violation = await violationCrudService.createViolation(parsed.data);
  sendCreated(res, violation);
});

export const acknowledgeViolation = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      throw createValidationError('Invalid violation ID');
    }

    const parsed = acknowledgeViolationSchema.safeParse(req.body);
    if (!parsed.success) {
      throw createValidationError('Invalid acknowledge data', parsed.error.flatten().fieldErrors);
    }

    const userId = req.user!.id;
    const violation = await violationCrudService.acknowledgeViolation(id, userId, parsed.data);
    sendOk(res, violation);
  },
);
