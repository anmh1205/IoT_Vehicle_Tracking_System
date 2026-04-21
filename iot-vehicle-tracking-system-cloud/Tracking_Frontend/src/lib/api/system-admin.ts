import { apiClient, unwrap } from './client';

export interface SystemAdminHealthCheck {
  status: 'ok' | 'degraded' | 'down';
  latencyMs?: number;
  error?: string;
  endpoint?: string;
  lastSeenAt?: string;
  details?: Record<string, unknown>;
}

export interface SystemAdminHealthResponse {
  status: 'ok' | 'degraded' | 'down';
  checks: Record<string, SystemAdminHealthCheck>;
  uptime: number;
  timestamp: string;
}

export interface SystemTableColumnResponse {
  name: string;
  dataType: string;
  isNullable: boolean;
}

export interface SystemTableQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  from?: string;
  to?: string;
}

export interface SystemAdminTableQueryResponse {
  items: Record<string, unknown>[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SystemAdminSetting {
  key: string;
  value: unknown;
  description: string | null;
  groupName: string;
  isPublic: boolean;
  updatedAt: string | null;
}

export interface SystemAdminMetricsResponse {
  query: string;
  time?: string;
  rangeApplied: boolean;
  step?: string;
  source: 'victoriametrics';
  result: unknown;
}

export interface SystemAdminLogsResponse {
  query: string;
  pagination: {
    limit: number;
    offset: number;
    total: number;
    returned: number;
  };
  items: Array<{
    id: string;
    timestamp: string;
    level: 'error' | 'warn' | 'info' | 'debug';
    source: string;
    message: string;
    stack: string | null;
  }>;
}

export type VmSettingResource =
  | 'datasource'
  | 'query-template'
  | 'rule'
  | 'tenant'
  | 'retention'
  | 'access';

export interface CreateSystemAdminSettingPayload {
  key: string;
  value: unknown;
  description?: string;
  groupName?: string;
  isPublic?: boolean;
  resource?: VmSettingResource;
  idempotencyKey?: string;
}

export interface UpdateSystemAdminSettingPayload {
  value: unknown;
  expectedRevision?: number;
  resource?: VmSettingResource;
  idempotencyKey?: string;
}

export interface ActivateVmSettingPayload {
  expectedRevision: number;
  resource?: VmSettingResource;
  idempotencyKey?: string;
}

export interface RollbackVmSettingPayload {
  targetRevision: number;
  expectedRevision: number;
  idempotencyKey?: string;
}

export interface VmSettingRevision {
  id: string;
  settingKey: string;
  revision: number;
  action: 'create' | 'update' | 'delete' | 'validate' | 'activate' | 'rollback';
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

export interface VmSettingValidation {
  valid: boolean;
  resource: VmSettingResource;
  warnings: string[];
  errors: string[];
  blastRadius: {
    affectsTenants: number;
    affectedRulePacks: number;
  };
}

export const systemAdminServices = {
  health: () =>
    apiClient.get('/system-admin/health').then((r) => unwrap<SystemAdminHealthResponse>(r.data)),
  metrics: (params: { query: string; time?: string }) =>
    apiClient
      .get('/system-admin/metrics', { params })
      .then((r) => unwrap<SystemAdminMetricsResponse>(r.data)),
  logs: (params: { query?: string; limit?: number; offset?: number }) =>
    apiClient
      .get('/system-admin/logs', { params })
      .then((r) => unwrap<SystemAdminLogsResponse>(r.data)),
  audit: (params: Record<string, unknown>) =>
    apiClient.get('/system-admin/audit', { params }).then((r) => unwrap<unknown>(r.data)),
  getSettings: (params?: { resource?: VmSettingResource }) =>
    apiClient
      .get('/system-admin/vm/settings', { params })
      .then((r) => unwrap<{ settings: SystemAdminSetting[] }>(r.data)),
  createSetting: (payload: CreateSystemAdminSettingPayload) =>
    apiClient
      .post('/system-admin/vm/settings', payload)
      .then((r) => unwrap<{ setting: SystemAdminSetting; revision: VmSettingRevision }>(r.data)),
  updateSetting: (key: string, payload: UpdateSystemAdminSettingPayload) =>
    apiClient
      .put(`/system-admin/vm/settings/${encodeURIComponent(key)}`, payload)
      .then((r) => unwrap<{ setting: SystemAdminSetting; revision: VmSettingRevision }>(r.data)),
  deleteSetting: (
    key: string,
    params: { expectedRevision: number; resource?: VmSettingResource; idempotencyKey?: string },
  ) =>
    apiClient
      .delete(`/system-admin/vm/settings/${encodeURIComponent(key)}`, { params })
      .then((r) => unwrap<{ key: string; deleted: boolean; revision: VmSettingRevision }>(r.data)),
  validateSetting: (key: string, payload?: { resource?: VmSettingResource }) =>
    apiClient
      .post(`/system-admin/vm/settings/${encodeURIComponent(key)}/validate`, payload ?? {})
      .then((r) => unwrap<VmSettingValidation>(r.data)),
  activateSetting: (key: string, payload: ActivateVmSettingPayload) =>
    apiClient
      .post(`/system-admin/vm/settings/${encodeURIComponent(key)}/activate`, payload)
      .then((r) => unwrap<{ setting: SystemAdminSetting; revision: VmSettingRevision }>(r.data)),
  rollbackSetting: (key: string, payload: RollbackVmSettingPayload) =>
    apiClient
      .post(`/system-admin/vm/settings/${encodeURIComponent(key)}/rollback`, payload)
      .then((r) => unwrap<{ setting: SystemAdminSetting; revision: VmSettingRevision }>(r.data)),
  listSettingRevisions: (key: string, params?: { limit?: number }) =>
    apiClient
      .get(`/system-admin/vm/settings/${encodeURIComponent(key)}/revisions`, { params })
      .then((r) => unwrap<{ revisions: VmSettingRevision[] }>(r.data)),
  listTables: () => apiClient.get('/system-admin/tables').then((r) => unwrap<string[]>(r.data)),
  getTableColumns: (table: string) =>
    apiClient
      .get(`/system-admin/tables/${encodeURIComponent(table)}/columns`)
      .then((r) => unwrap<SystemTableColumnResponse[]>(r.data)),
  queryTable: (table: string, params?: SystemTableQueryParams) =>
    apiClient
      .get(`/system-admin/tables/${encodeURIComponent(table)}`, { params })
      .then((r) => unwrap<SystemAdminTableQueryResponse>(r.data)),
};
