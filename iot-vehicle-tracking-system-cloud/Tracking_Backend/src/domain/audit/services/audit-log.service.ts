import * as auditLogRepo from '@/domain/audit/repositories/audit-log.repository';
import { logger } from '@/infrastructure/logger';
import type {
  AuditLog,
  AuditLogRecordPublic,
  AuditLogListQuery,
  RecordAuditInput,
} from '@/domain/audit/types/audit-log.types';

const sanitize = (log: AuditLog): AuditLogRecordPublic => ({
  id: log.id,
  userId: log.user_id,
  action: log.action,
  entityType: log.entity_type,
  entityId: log.entity_id,
  changes: log.changes,
  ipAddress: log.ip_address,
  userAgent: log.user_agent,
  createdAt: log.created_at.toISOString(),
});

/**
 * Record an audit log entry.
 * Fire-and-forget safe — errors are logged but never rethrown to avoid
 * disrupting the main operation.
 */
export const record = async (params: RecordAuditInput): Promise<void> => {
  try {
    await auditLogRepo.create(params);
  } catch (err) {
    logger.warn(`Failed to write audit log [${params.action}] on ${params.entityType}/${params.entityId}: ${err}`);
  }
};

/** List audit logs with filters (admin use) */
export const listLogs = async (
  query: AuditLogListQuery,
): Promise<{ logs: AuditLogRecordPublic[]; total: number; page: number; limit: number }> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const result = await auditLogRepo.findAll(query);

  return {
    logs: result.logs.map(sanitize),
    total: result.total,
    page,
    limit,
  };
};
