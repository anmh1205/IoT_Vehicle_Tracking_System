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

export const systemAdminServices = {
  health: () =>
    apiClient.get('/system-admin/health').then((r) => unwrap<SystemAdminHealthResponse>(r.data)),
  metrics: (params: { query: string; time?: string }) =>
    apiClient.get('/system-admin/metrics', { params }).then((r) => unwrap<any>(r.data)),
  logs: (params: { query: string; limit?: number }) =>
    apiClient.get('/system-admin/logs', { params }).then((r) => unwrap<any>(r.data)),
  audit: (params: Record<string, unknown>) =>
    apiClient.get('/system-admin/audit', { params }).then((r) => unwrap<any>(r.data)),
  getSettings: () => apiClient.get('/system-admin/settings').then((r) => unwrap<any>(r.data)),
  updateSetting: (key: string, value: unknown) =>
    apiClient.put(`/system-admin/settings/${key}`, { value }).then((r) => unwrap<any>(r.data)),
  listTables: () => apiClient.get('/system-admin/tables').then((r) => unwrap<string[]>(r.data)),
  getTableColumns: (table: string) =>
    apiClient
      .get(`/system-admin/tables/${table}/columns`)
      .then((r) => unwrap<SystemTableColumnResponse[]>(r.data)),
  queryTable: (table: string, params?: SystemTableQueryParams) =>
    apiClient.get(`/system-admin/tables/${table}`, { params }).then((r) => unwrap<any>(r.data)),
};
