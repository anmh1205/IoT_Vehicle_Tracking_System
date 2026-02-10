export interface UserAuditLog {
  id: number;
  timestamp: Date;
  actor_user_id: number | null;
  actor_username: string | null;
  actor_ip: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  target_user_id: number | null;
  details: Record<string, unknown> | null;
  correlation_id: string | null;
  success: boolean | null;
}

export interface AuditLogPublic {
  id: number;
  timestamp: string;
  actorUserId: number | null;
  actorUsername: string | null;
  actorIp: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  targetUserId: number | null;
  details: Record<string, unknown> | null;
  correlationId: string | null;
  success: boolean | null;
}

export interface AuditQuery {
  page?: number;
  limit?: number;
  table: 'user' | 'device' | 'firmware';
  actorUserId?: number;
  startDate?: string;
  endDate?: string;
}

export interface LogUserActionInput {
  actorUserId: number | null;
  actorUsername: string | null;
  actorIp: string | null;
  action: string;
  resourceType?: string;
  resourceId?: string;
  targetUserId?: number;
  details?: Record<string, unknown>;
  correlationId?: string;
  success?: boolean;
}

export interface LogDeviceActionInput {
  actorUserId: number | null;
  actorUsername: string | null;
  actorIp: string | null;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  correlationId?: string;
  success?: boolean;
}

export interface LogFirmwareActionInput {
  actorUserId: number | null;
  actorUsername: string | null;
  actorIp: string | null;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  correlationId?: string;
  success?: boolean;
}
