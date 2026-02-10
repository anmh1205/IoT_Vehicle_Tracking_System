import { pool } from '@/infrastructure/database/pool';
import { insertOne, findMany } from '@/infrastructure/database/queries';
import type {
  UserAuditLog,
  AuditQuery,
  LogUserActionInput,
  LogDeviceActionInput,
  LogFirmwareActionInput,
} from '@/domain/audit/types/audit.types';

interface CountRow {
  count: string;
}

const AUDIT_TABLES: Record<string, string> = {
  user: 'user_audit_logs',
  device: 'device_audit_logs',
  firmware: 'firmware_audit_logs',
};

export const logUserAction = async (data: LogUserActionInput): Promise<UserAuditLog> =>
  insertOne<UserAuditLog>(
    `INSERT INTO user_audit_logs
     (timestamp, actor_user_id, actor_username, actor_ip, action, resource_type, resource_id, target_user_id, details, correlation_id, success)
     VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      data.actorUserId,
      data.actorUsername,
      data.actorIp,
      data.action,
      data.resourceType ?? null,
      data.resourceId ?? null,
      data.targetUserId ?? null,
      data.details ? JSON.stringify(data.details) : null,
      data.correlationId ?? null,
      data.success ?? true,
    ],
  );

export const logDeviceAction = async (data: LogDeviceActionInput): Promise<UserAuditLog> =>
  insertOne<UserAuditLog>(
    `INSERT INTO device_audit_logs
     (timestamp, actor_user_id, actor_username, actor_ip, action, resource_type, resource_id, details, correlation_id, success)
     VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      data.actorUserId,
      data.actorUsername,
      data.actorIp,
      data.action,
      data.resourceType ?? null,
      data.resourceId ?? null,
      data.details ? JSON.stringify(data.details) : null,
      data.correlationId ?? null,
      data.success ?? true,
    ],
  );

export const logFirmwareAction = async (data: LogFirmwareActionInput): Promise<UserAuditLog> =>
  insertOne<UserAuditLog>(
    `INSERT INTO firmware_audit_logs
     (timestamp, actor_user_id, actor_username, actor_ip, action, resource_type, resource_id, details, correlation_id, success)
     VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      data.actorUserId,
      data.actorUsername,
      data.actorIp,
      data.action,
      data.resourceType ?? null,
      data.resourceId ?? null,
      data.details ? JSON.stringify(data.details) : null,
      data.correlationId ?? null,
      data.success ?? true,
    ],
  );

export const queryAuditLogs = async (
  query: AuditQuery,
): Promise<{ logs: UserAuditLog[]; total: number }> => {
  const tableName = AUDIT_TABLES[query.table];
  if (!tableName) {
    return { logs: [], total: 0 };
  }

  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (query.actorUserId !== undefined) {
    conditions.push(`actor_user_id = $${paramIndex++}`);
    params.push(query.actorUserId);
  }

  if (query.startDate) {
    conditions.push(`timestamp >= $${paramIndex++}`);
    params.push(query.startDate);
  }

  if (query.endDate) {
    conditions.push(`timestamp <= $${paramIndex++}`);
    params.push(query.endDate);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query<CountRow>(
    `SELECT COUNT(*)::text as count FROM ${tableName} ${whereClause}`,
    params,
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const logs = await findMany<UserAuditLog>(
    `SELECT * FROM ${tableName} ${whereClause} ORDER BY timestamp DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset],
  );

  return { logs, total };
};
