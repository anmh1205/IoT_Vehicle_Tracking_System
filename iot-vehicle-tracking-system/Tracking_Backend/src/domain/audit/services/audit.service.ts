import * as auditRepo from '@/domain/audit/repositories/audit.repository';
import type {
  UserAuditLog,
  AuditLogPublic,
  AuditQuery,
  LogUserActionInput,
  LogDeviceActionInput,
  LogFirmwareActionInput,
} from '@/domain/audit/types/audit.types';

const sanitizeAuditLog = (log: UserAuditLog): AuditLogPublic => ({
  id: log.id,
  timestamp: log.timestamp.toISOString(),
  actorUserId: log.actor_user_id,
  actorUsername: log.actor_username,
  actorIp: log.actor_ip,
  action: log.action,
  resourceType: log.resource_type,
  resourceId: log.resource_id,
  targetUserId: log.target_user_id,
  details: log.details,
  correlationId: log.correlation_id,
  success: log.success,
});

export const logUserAction = async (data: LogUserActionInput): Promise<AuditLogPublic> => {
  const log = await auditRepo.logUserAction(data);
  return sanitizeAuditLog(log);
};

export const logDeviceAction = async (data: LogDeviceActionInput): Promise<AuditLogPublic> => {
  const log = await auditRepo.logDeviceAction(data);
  return sanitizeAuditLog(log);
};

export const logFirmwareAction = async (data: LogFirmwareActionInput): Promise<AuditLogPublic> => {
  const log = await auditRepo.logFirmwareAction(data);
  return sanitizeAuditLog(log);
};

export const queryLogs = async (
  query: AuditQuery,
): Promise<{ logs: AuditLogPublic[]; total: number; page: number; limit: number }> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  const result = await auditRepo.queryAuditLogs(query);

  return {
    logs: result.logs.map(sanitizeAuditLog),
    total: result.total,
    page,
    limit,
  };
};
