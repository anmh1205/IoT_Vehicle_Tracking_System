import { apiClient, unwrap } from './client';

export const exportServices = {
  getList: (params?: Record<string, unknown>) => apiClient.get('/export', { params }).then((r) => unwrap<any>(r.data)),
  create: (data: Record<string, unknown>) => apiClient.post('/export', data).then((r) => unwrap<any>(r.data)),
  getById: (id: number) => apiClient.get(`/export/${id}`).then((r) => unwrap<any>(r.data)),
  downloadUrl: (id: number) => `/api/v1/export/${id}/download`,
};
