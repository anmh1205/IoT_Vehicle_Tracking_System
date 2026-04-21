export type VmSettingResource = 'datasource' | 'query-template' | 'rule' | 'tenant' | 'retention' | 'access';

export type VmSettingAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'validate'
  | 'activate'
  | 'rollback';

export interface VmSetting {
  key: string;
  value: unknown;
  description: string | null;
  groupName: string;
  isPublic: boolean;
  updatedAt: string | null;
}

export interface SystemAdminMetricsQueryInput {
  query: string;
  time?: string;
}

export interface SystemAdminMetricsQueryResult {
  query: string;
  time?: string;
  rangeApplied: boolean;
  step?: string;
  source: 'victoriametrics';
  result: unknown;
}

export interface SystemAdminLogsQueryInput {
  query: string;
  limit?: number;
  offset?: number;
}

export interface SystemAdminLogItem {
  id: string;
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  source: string;
  message: string;
  stack: string | null;
}

export interface SystemAdminLogsQueryResult {
  query: string;
  pagination: {
    limit: number;
    offset: number;
    total: number;
    returned: number;
  };
  items: SystemAdminLogItem[];
}

export interface VmSettingRevision {
  id: string;
  settingKey: string;
  revision: number;
  action: VmSettingAction;
  snapshot: {
    key: string;
    value: unknown;
    description: string | null;
    groupName: string;
    isPublic: boolean;
    updatedAt: string | null;
  };
  actorUserId: number | null;
  createdAt: string;
}

export interface VmSettingValidationResult {
  valid: boolean;
  resource: VmSettingResource;
  warnings: string[];
  errors: string[];
  blastRadius: {
    affectsTenants: number;
    affectedRulePacks: number;
  };
}

export interface VmSettingCreateInput {
  key: string;
  value: unknown;
  description?: string | null;
  groupName?: string;
  isPublic?: boolean;
  resource?: VmSettingResource;
  idempotencyKey?: string;
  actorUserId?: number;
}

export interface VmSettingUpdateInput {
  key: string;
  value: unknown;
  expectedRevision: number;
  resource?: VmSettingResource;
  idempotencyKey?: string;
  actorUserId?: number;
}

export interface VmSettingDeleteInput {
  key: string;
  expectedRevision: number;
  resource?: VmSettingResource;
  idempotencyKey?: string;
  actorUserId?: number;
}

export interface VmSettingActivateInput {
  key: string;
  expectedRevision: number;
  resource?: VmSettingResource;
  idempotencyKey?: string;
  actorUserId?: number;
}

export interface VmSettingRollbackInput {
  key: string;
  targetRevision: number;
  expectedRevision: number;
  idempotencyKey?: string;
  actorUserId?: number;
}

export interface VmSettingIdempotentResult<T> {
  reused: boolean;
  data: T;
}
