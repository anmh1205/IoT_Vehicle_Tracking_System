import type { Response } from 'express';
import type { AuthenticatedRequest } from '@/shared/types/common.types';
import { asyncHandler } from '@/shared/utils/async-handler.util';
import { sendOk } from '@/shared/utils/response.util';
import { createForbiddenError, createValidationError } from '@/shared/utils/errors.util';
import * as systemAdminService from '@/domain/system-admin/services/system-admin.service';
import * as auditService from '@/domain/audit/services/audit.service';
import type { AuditQuery } from '@/domain/audit/types/audit.types';

const ADMIN_ROLES = ['admin', 'root'];

const requireAdminRole = (req: AuthenticatedRequest): void => {
  if (!req.user || !ADMIN_ROLES.includes(req.user.role)) {
    throw createForbiddenError('Admin access required');
  }
};

export const getHealth = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  requireAdminRole(req);

  const health = await systemAdminService.getSystemHealth();
  sendOk(res, health);
});

export const queryMetrics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  requireAdminRole(req);

  const promql = req.query.query as string;
  if (!promql) {
    throw createValidationError('Missing required query parameter: query');
  }

  const time = req.query.time as string | undefined;
  const result = await systemAdminService.queryMetrics(promql, time);
  sendOk(res, result);
});

export const queryLogs = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  requireAdminRole(req);

  const logsql = req.query.query as string;
  if (!logsql) {
    throw createValidationError('Missing required query parameter: query');
  }

  const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : undefined;
  const result = await systemAdminService.queryLogs(logsql, limit);
  sendOk(res, result);
});

export const queryAudit = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  requireAdminRole(req);

  const table = req.query.table as string;
  if (!table || !['user', 'device', 'firmware'].includes(table)) {
    throw createValidationError('Missing or invalid query parameter: table (user | device | firmware)');
  }

  const query: AuditQuery = {
    table: table as 'user' | 'device' | 'firmware',
    page: req.query.page ? Number.parseInt(req.query.page as string, 10) : undefined,
    limit: req.query.limit ? Number.parseInt(req.query.limit as string, 10) : undefined,
    actorUserId: req.query.actorUserId
      ? Number.parseInt(req.query.actorUserId as string, 10)
      : undefined,
    startDate: req.query.startDate as string | undefined,
    endDate: req.query.endDate as string | undefined,
  };

  const result = await auditService.queryLogs(query);
  sendOk(res, result);
});
