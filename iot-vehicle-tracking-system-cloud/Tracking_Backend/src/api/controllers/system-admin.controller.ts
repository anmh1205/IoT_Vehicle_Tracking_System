import type { Response } from 'express';
import type { AuthenticatedRequest } from '@/shared/types/common.types';
import { asyncHandler } from '@/shared/utils/async-handler.util';
import { sendOk } from '@/shared/utils/response.util';
import {
  createForbiddenError,
  createNotFoundError,
  createValidationError,
} from '@/shared/utils/errors.util';
import * as systemAdminService from '@/domain/system-admin/services/system-admin.service';
import * as auditService from '@/domain/audit/services/audit.service';
import type { AuditQuery } from '@/domain/audit/types/audit.types';
import {
  activateVmSettingBodySchema,
  createVmSettingBodySchema,
  deleteVmSettingQuerySchema,
  listVmSettingsQuerySchema,
  logsQuerySchema,
  metricsQuerySchema,
  queryTablePathSchema,
  queryTableQuerySchema,
  rollbackVmSettingBodySchema,
  updateVmSettingBodySchema,
  validateVmSettingBodySchema,
  vmSettingPathSchema,
  vmSettingRevisionsQuerySchema,
} from '@/api/validators/system-admin.validator';

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

  const queryParsed = metricsQuerySchema.safeParse(req.query);
  if (!queryParsed.success) {
    throw createValidationError('INVALID_SYSTEM_ADMIN_METRICS_QUERY', queryParsed.error.flatten().fieldErrors);
  }

  const result = await systemAdminService.queryMetrics({
    query: queryParsed.data.query,
    time: queryParsed.data.time,
  });
  sendOk(res, result);
});

export const queryLogs = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  requireAdminRole(req);

  const queryParsed = logsQuerySchema.safeParse(req.query);
  if (!queryParsed.success) {
    throw createValidationError('INVALID_SYSTEM_ADMIN_LOGS_QUERY', queryParsed.error.flatten().fieldErrors);
  }

  const result = await systemAdminService.queryLogs({
    query: queryParsed.data.query ?? '*',
    limit: queryParsed.data.limit,
    offset: queryParsed.data.offset,
  });
  sendOk(res, result);
});

export const queryAudit = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  requireAdminRole(req);

  const table = req.query.table as string;
  if (!table || !['user', 'device', 'firmware'].includes(table)) {
    throw createValidationError(
      'Missing or invalid query parameter: table (user | device | firmware)',
    );
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

export const listTables = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  requireAdminRole(req);
  const tables = await systemAdminService.listAvailableTables();
  sendOk(res, tables);
});

export const listTableColumns = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  requireAdminRole(req);

  const pathParsed = queryTablePathSchema.safeParse(req.params);
  if (!pathParsed.success) {
    throw createValidationError(
      'INVALID_SYSTEM_ADMIN_TABLE_PATH',
      pathParsed.error.flatten().fieldErrors,
    );
  }

  const columns = await systemAdminService.getTableColumns(pathParsed.data.table);
  sendOk(res, columns);
});

export const queryTable = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  requireAdminRole(req);

  const pathParsed = queryTablePathSchema.safeParse(req.params);
  if (!pathParsed.success) {
    throw createValidationError(
      'INVALID_SYSTEM_ADMIN_TABLE_PATH',
      pathParsed.error.flatten().fieldErrors,
    );
  }

  const queryParsed = queryTableQuerySchema.safeParse(req.query);
  if (!queryParsed.success) {
    throw createValidationError(
      'INVALID_SYSTEM_ADMIN_TABLE_QUERY',
      queryParsed.error.flatten().fieldErrors,
    );
  }

  const result = await systemAdminService.queryTable(pathParsed.data.table, {
    page: queryParsed.data.page,
    limit: queryParsed.data.limit,
    search: queryParsed.data.search,
    from: queryParsed.data.from,
    to: queryParsed.data.to,
  });
  sendOk(res, result);
});

export const listVmSettings = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  requireAdminRole(req);

  const queryParsed = listVmSettingsQuerySchema.safeParse(req.query);
  if (!queryParsed.success) {
    throw createValidationError(
      'INVALID_SYSTEM_ADMIN_VM_SETTINGS_QUERY',
      queryParsed.error.flatten().fieldErrors,
    );
  }

  const settings = await systemAdminService.listVmSettings(queryParsed.data.resource);
  sendOk(res, { settings });
});

export const createVmSetting = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  requireAdminRole(req);

  const bodyParsed = createVmSettingBodySchema.safeParse(req.body);
  if (!bodyParsed.success) {
    throw createValidationError(
      'INVALID_SYSTEM_ADMIN_VM_CREATE_PAYLOAD',
      bodyParsed.error.flatten().fieldErrors,
    );
  }

  const result = await systemAdminService.createVmSetting({
    key: bodyParsed.data.key,
    value: bodyParsed.data.value,
    description: bodyParsed.data.description,
    groupName: bodyParsed.data.groupName,
    isPublic: bodyParsed.data.isPublic,
    resource: bodyParsed.data.resource,
    idempotencyKey: bodyParsed.data.idempotencyKey,
    actorUserId: req.user?.id,
  });

  sendOk(res, result.data, {
    reusedIdempotency: result.reused,
  });
});

export const updateVmSetting = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  requireAdminRole(req);

  const pathParsed = vmSettingPathSchema.safeParse(req.params);
  if (!pathParsed.success) {
    throw createValidationError(
      'INVALID_SYSTEM_ADMIN_VM_SETTING_KEY',
      pathParsed.error.flatten().fieldErrors,
    );
  }

  const bodyParsed = updateVmSettingBodySchema.safeParse(req.body);
  if (!bodyParsed.success) {
    throw createValidationError(
      'INVALID_SYSTEM_ADMIN_VM_UPDATE_PAYLOAD',
      bodyParsed.error.flatten().fieldErrors,
    );
  }

  const result = await systemAdminService.updateVmSetting({
    key: pathParsed.data.key,
    value: bodyParsed.data.value,
    expectedRevision: bodyParsed.data.expectedRevision,
    resource: bodyParsed.data.resource,
    idempotencyKey: bodyParsed.data.idempotencyKey,
    actorUserId: req.user?.id,
  });

  if (!result) {
    throw createNotFoundError('SYSTEM_ADMIN_VM_SETTING_NOT_FOUND');
  }

  sendOk(res, result.data, {
    reusedIdempotency: result.reused,
  });
});

export const deleteVmSetting = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  requireAdminRole(req);

  const pathParsed = vmSettingPathSchema.safeParse(req.params);
  if (!pathParsed.success) {
    throw createValidationError(
      'INVALID_SYSTEM_ADMIN_VM_SETTING_KEY',
      pathParsed.error.flatten().fieldErrors,
    );
  }

  const queryParsed = deleteVmSettingQuerySchema.safeParse(req.query);
  if (!queryParsed.success) {
    throw createValidationError(
      'INVALID_SYSTEM_ADMIN_VM_DELETE_QUERY',
      queryParsed.error.flatten().fieldErrors,
    );
  }

  const result = await systemAdminService.deleteVmSetting({
    key: pathParsed.data.key,
    ...queryParsed.data,
    actorUserId: req.user?.id,
  });

  if (!result) {
    throw createNotFoundError('SYSTEM_ADMIN_VM_SETTING_NOT_FOUND');
  }

  sendOk(res, result.data, {
    reusedIdempotency: result.reused,
  });
});

export const validateVmSetting = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  requireAdminRole(req);

  const pathParsed = vmSettingPathSchema.safeParse(req.params);
  if (!pathParsed.success) {
    throw createValidationError(
      'INVALID_SYSTEM_ADMIN_VM_SETTING_KEY',
      pathParsed.error.flatten().fieldErrors,
    );
  }

  const bodyParsed = validateVmSettingBodySchema.safeParse(req.body ?? {});
  if (!bodyParsed.success) {
    throw createValidationError(
      'INVALID_SYSTEM_ADMIN_VM_VALIDATE_PAYLOAD',
      bodyParsed.error.flatten().fieldErrors,
    );
  }

  const validation = await systemAdminService.validateVmSetting(
    pathParsed.data.key,
    bodyParsed.data.resource,
  );

  sendOk(res, validation);
});

export const activateVmSetting = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  requireAdminRole(req);

  const pathParsed = vmSettingPathSchema.safeParse(req.params);
  if (!pathParsed.success) {
    throw createValidationError(
      'INVALID_SYSTEM_ADMIN_VM_SETTING_KEY',
      pathParsed.error.flatten().fieldErrors,
    );
  }

  const bodyParsed = activateVmSettingBodySchema.safeParse(req.body);
  if (!bodyParsed.success) {
    throw createValidationError(
      'INVALID_SYSTEM_ADMIN_VM_ACTIVATE_PAYLOAD',
      bodyParsed.error.flatten().fieldErrors,
    );
  }

  const result = await systemAdminService.activateVmSetting({
    key: pathParsed.data.key,
    ...bodyParsed.data,
    actorUserId: req.user?.id,
  });

  sendOk(res, result.data, {
    reusedIdempotency: result.reused,
  });
});

export const rollbackVmSetting = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  requireAdminRole(req);

  const pathParsed = vmSettingPathSchema.safeParse(req.params);
  if (!pathParsed.success) {
    throw createValidationError(
      'INVALID_SYSTEM_ADMIN_VM_SETTING_KEY',
      pathParsed.error.flatten().fieldErrors,
    );
  }

  const bodyParsed = rollbackVmSettingBodySchema.safeParse(req.body);
  if (!bodyParsed.success) {
    throw createValidationError(
      'INVALID_SYSTEM_ADMIN_VM_ROLLBACK_PAYLOAD',
      bodyParsed.error.flatten().fieldErrors,
    );
  }

  const result = await systemAdminService.rollbackVmSetting({
    key: pathParsed.data.key,
    ...bodyParsed.data,
    actorUserId: req.user?.id,
  });

  sendOk(res, result.data, {
    reusedIdempotency: result.reused,
  });
});

export const listVmSettingRevisions = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  requireAdminRole(req);

  const pathParsed = vmSettingPathSchema.safeParse(req.params);
  if (!pathParsed.success) {
    throw createValidationError(
      'INVALID_SYSTEM_ADMIN_VM_SETTING_KEY',
      pathParsed.error.flatten().fieldErrors,
    );
  }

  const queryParsed = vmSettingRevisionsQuerySchema.safeParse(req.query);
  if (!queryParsed.success) {
    throw createValidationError(
      'INVALID_SYSTEM_ADMIN_VM_REVISIONS_QUERY',
      queryParsed.error.flatten().fieldErrors,
    );
  }

  const revisions = await systemAdminService.listVmSettingRevisions(
    pathParsed.data.key,
    queryParsed.data.limit,
  );

  sendOk(res, { revisions });
});

