import { findMany } from '@/infrastructure/database/queries';
import { pool } from '@/infrastructure/database/pool';
import type { PoolClient } from 'pg';
import type { AuditLog, AuditLogListQuery, RecordAuditInput } from '@/domain/audit/types/audit-log.types';

interface CountRow {
  count: string;
}

/** Insert a new audit log entry */
export const create = async (
  input: RecordAuditInput,
  client?: PoolClient,
): Promise<AuditLog> => {
  const db = client ?? pool;
  const result = await db.query<AuditLog>(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes, ip_address, user_agent, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     RETURNING *`,
    [
      input.userId,
      input.action,
      input.entityType,
      input.entityId,
      input.changes ? JSON.stringify(input.changes) : null,
      input.ipAddress ?? null,
      input.userAgent ?? null,
    ],
  );
  return result.rows[0] as AuditLog;
};

/** Query audit logs with filters + pagination */
export const findAll = async (
  query: AuditLogListQuery,
): Promise<{ logs: AuditLog[]; total: number }> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (query.userId !== undefined) {
    conditions.push(`user_id = $${paramIndex++}`);
    params.push(query.userId);
  }
  if (query.action) {
    conditions.push(`action = $${paramIndex++}`);
    params.push(query.action);
  }
  if (query.entityType) {
    conditions.push(`entity_type = $${paramIndex++}`);
    params.push(query.entityType);
  }
  if (query.entityId) {
    conditions.push(`entity_id = $${paramIndex++}`);
    params.push(query.entityId);
  }
  if (query.startDate) {
    conditions.push(`created_at >= $${paramIndex++}`);
    params.push(query.startDate);
  }
  if (query.endDate) {
    conditions.push(`created_at <= $${paramIndex++}`);
    params.push(query.endDate);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query<CountRow>(
    `SELECT COUNT(*)::text as count FROM audit_logs ${whereClause}`,
    params,
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const logs = await findMany<AuditLog>(
    `SELECT * FROM audit_logs ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset],
  );

  return { logs, total };
};
