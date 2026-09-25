import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '@/shared/types/common.types';
import { createForbiddenError, createUnauthorizedError } from '@/shared/utils/errors.util';
import { canAccessDeviceReference } from '@/domain/device/services/device-access.service';

export const requireDeviceAccess = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw createUnauthorizedError('Authentication required');
    }

    const rawId = String(req.params.id ?? '').trim();
    if (!rawId) {
      throw createForbiddenError('Device access denied');
    }

    if (!(await canAccessDeviceReference(req.user, rawId))) {
      throw createForbiddenError('Device access denied');
    }

    next();
  } catch (error) {
    next(error);
  }
};
