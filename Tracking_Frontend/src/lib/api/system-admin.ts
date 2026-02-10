import { apiClient, unwrap } from './client';

export const systemAdminServices = {
  health: () => apiClient.get('/system-admin/health').then((r) => unwrap<any>(r.data)),
  metrics: (params: { query: string; time?: string }) => apiClient.get('/system-admin/metrics', { params }).then((r) => unwrap<any>(r.data)),
  logs: (params: { query: string; limit?: number }) => apiClient.get('/system-admin/logs', { params }).then((r) => unwrap<any>(r.data)),
  audit: (params: Record<string, unknown>) => apiClient.get('/system-admin/audit', { params }).then((r) => unwrap<any>(r.data)),
  getSettings: () => apiClient.get('/system-admin/settings').then((r) => unwrap<any>(r.data)),
  updateSetting: (key: string, value: unknown) => apiClient.put(`/system-admin/settings/${key}`, { value }).then((r) => unwrap<any>(r.data)),
  listTables: () => apiClient.get('/system-admin/tables').then((r) => unwrap<string[]>(r.data)),
  queryTable: (table: string, params?: Record<string, unknown>) =>
    apiClient.get(`/system-admin/tables/${table}`, { params }).then((r) => unwrap<any>(r.data)),
};
