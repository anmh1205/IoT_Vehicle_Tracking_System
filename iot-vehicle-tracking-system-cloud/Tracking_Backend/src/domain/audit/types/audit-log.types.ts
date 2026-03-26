/** General-purpose audit log record (stored in audit_logs table) */
export interface AuditLog {
  id: number;
  user_id: number | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  changes: Record<string, { old: unknown; new: unknown }> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}

/** Public-facing shape (camelCase) */
export interface AuditLogRecordPublic {
  id: number;
  userId: number | null;
  action: string;
  entityType: string;
  entityId: string | null;
  changes: Record<string, { old: unknown; new: unknown }> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

/** Input for recording an audit log entry */
export interface RecordAuditInput {
  userId: number;
  action: string;
  entityType: string;
  entityId: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  ipAddress?: string;
  userAgent?: string;
}

/** Query filters for listing audit logs */
export interface AuditLogListQuery {
  page?: number;
  limit?: number;
  userId?: number;
  action?: string;
  entityType?: string;
  entityId?: string;
  startDate?: string;
  endDate?: string;
}
