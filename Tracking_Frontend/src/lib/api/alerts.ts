import { apiClient, unwrap } from './client';

export const alertServices = {
  getList: (params?: Record<string, unknown>) => apiClient.get('/alerts', { params }).then((r) => unwrap<any>(r.data)),
  getById: (id: number) => apiClient.get(`/alerts/${id}`).then((r) => unwrap<any>(r.data)),
  create: (data: Record<string, unknown>) => apiClient.post('/alerts', data).then((r) => unwrap<any>(r.data)),
  acknowledge: (id: number) => apiClient.put(`/alerts/${id}/acknowledge`).then((r) => unwrap<any>(r.data)),
  resolve: (id: number, data?: Record<string, unknown>) => apiClient.put(`/alerts/${id}/resolve`, data ?? {}).then((r) => unwrap<any>(r.data)),
  dismiss: (id: number) => apiClient.put(`/alerts/${id}/dismiss`).then((r) => unwrap<any>(r.data)),
  delete: (id: number) => apiClient.delete(`/alerts/${id}`).then((r) => unwrap<any>(r.data)),
};
