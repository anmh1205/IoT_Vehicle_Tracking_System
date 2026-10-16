import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from '@/shared/types/common.types';
import { createForbiddenError, createUnauthorizedError } from '@/shared/utils/errors.util';
import {
  hasAssetGrant,
  type AssetGrantReference,
} from '@/domain/asset/repositories/asset-grant.repository';

interface AssetWritePolicy {
  existing?: 'vehicleRow' | 'tripRow' | 'maintenanceRow';
  requireBodyReference?: boolean;
  forbidDeviceReassignment?: boolean;
}

/**
 * Fail-closed additional barrier for assigned manager/operator mutations.
 * Root/admin and explicitly all-access operators use existing role policy.
 * Restricts object ID guesses and replacement asset refs before side effects.
 *
 * Repository mutations must ultimately incorporate authorization into their
 * UPDATE/DELETE transactions to eliminate revocation races (tracked in #179).
 */
export const requireAssignedAssetWrite = (policy: AssetWritePolicy) =>
  async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = req.user;
      if (!actor) throw createUnauthorizedError('Authentication required');
      if (actor.role === 'root' || actor.role === 'admin' || actor.deviceAccessMode === 'all') {
        next();
        return;
      }
      if (!Number.isSafeInteger(actor.id) || actor.id <= 0) {
        throw createForbiddenError('Asset access denied');
      }

      const checks: Array<{ type: AssetGrantReference; value: string | number }> = [];
      if (policy.existing) {
        const id = Number(req.params.id);
        if (!Number.isSafeInteger(id) || id <= 0) {
          throw createForbiddenError('Asset access denied');
        }
        checks.push({ type: policy.existing, value: id });
      }

      const body: Record<string, unknown> =
        req.body && typeof req.body === 'object' && !Array.isArray(req.body)
          ? req.body as Record<string, unknown> : {};

      if (policy.forbidDeviceReassignment && Object.hasOwn(body, 'deviceId')) {
        throw createForbiddenError('Only administrators can reassign a vehicle device');
      }
      if (Object.hasOwn(body, 'vehicleId')) {
        if (typeof body.vehicleId !== 'string' || !body.vehicleId) {
          throw createForbiddenError('Asset access denied');
        }
        checks.push({ type: 'vehicleId', value: body.vehicleId });
      }
      if (Object.hasOwn(body, 'deviceId')) {
        if (typeof body.deviceId !== 'string' || !body.deviceId) {
          throw createForbiddenError('Asset access denied');
        }
        checks.push({ type: 'deviceId', value: body.deviceId });
      }
      if (policy.requireBodyReference && checks.length === 0) {
        throw createForbiddenError('An authorized vehicle or device is required');
      }

      for (const check of checks) {
        if (!await hasAssetGrant(actor.id, check.type, check.value)) {
          throw createForbiddenError('Asset access denied');
        }
      }
      next();
    } catch (error) {
      next(error);
    }
  };

/**
 * Guard vehicle-scoped endpoints that use a public vehicleId path parameter.
 * Particularly important for location previews and geofence-policy state.
 * The mutation repository still needs an atomic SQL grant check before write.
 */
export const requireAssignedVehicleRoute = async (
  req: AuthenticatedRequest, _res: Response, next: NextFunction,
): Promise<void> => {
  try {
    const actor = req.user;
    if (!actor) throw createUnauthorizedError('Authentication required');
    const vehicleId = req.params.vehicleId;
    if (typeof vehicleId !== 'string' || !vehicleId.trim()) {
      throw createForbiddenError('Vehicle access denied');
    }
    if (actor.role === 'root' || actor.role === 'admin' || actor.deviceAccessMode === 'all') {
      next();
      return;
    }
    if (!Number.isSafeInteger(actor.id) || actor.id <= 0 ||
        !await hasAssetGrant(actor.id, 'vehicleId', vehicleId)) {
      throw createForbiddenError('Vehicle access denied');
    }
    next();
  } catch (error) {
    next(error);
  }
};
