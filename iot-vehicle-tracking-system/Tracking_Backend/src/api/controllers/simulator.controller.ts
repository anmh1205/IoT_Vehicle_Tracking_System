import type { Response } from 'express';
import type { AuthenticatedRequest } from '@/shared/types/common.types';
import { asyncHandler } from '@/shared/utils/async-handler.util';
import { sendOk } from '@/shared/utils/response.util';
import { createForbiddenError, createValidationError } from '@/shared/utils/errors.util';
import { startSimulatorSchema } from '@/api/validators/simulator.validator';
import * as simulatorService from '@/domain/simulator/services/simulator.service';

const ADMIN_ROLES = new Set(['admin', 'root']);

const assertCanAccessSimulator = (req: AuthenticatedRequest): void => {
  if (!req.user || !ADMIN_ROLES.has(req.user.role)) {
    throw createForbiddenError('Admin access required');
  }
};

export const startSimulator = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  assertCanAccessSimulator(req);

  const parsed = startSimulatorSchema.safeParse(req.body);
  if (!parsed.success) {
    throw createValidationError('Invalid simulator payload', parsed.error.flatten().fieldErrors);
  }

  const result = await simulatorService.startSimulation(parsed.data, req.user!.id);
  sendOk(res, result);
});

export const stopSimulator = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  assertCanAccessSimulator(req);
  const result = await simulatorService.stopSimulation();
  sendOk(res, result);
});

export const pauseSimulator = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  assertCanAccessSimulator(req);
  const result = simulatorService.pauseSimulation();
  sendOk(res, result);
});

export const resumeSimulator = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  assertCanAccessSimulator(req);
  const result = simulatorService.resumeSimulation();
  sendOk(res, result);
});

export const getSimulatorStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  assertCanAccessSimulator(req);
  const result = simulatorService.getSimulationStatus();
  sendOk(res, result);
});
