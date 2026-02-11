import { apiClient, unwrap } from './client';

export const maintenanceServices = {
  getList: (params?: Record<string, unknown>) =>
    apiClient.get('/maintenance', { params }).then((r) => unwrap<any>(r.data)),
  getById: (id: number) => apiClient.get(`/maintenance/${id}`).then((r) => unwrap<any>(r.data)),
  create: (data: Record<string, unknown>) =>
    apiClient.post('/maintenance', data).then((r) => unwrap<any>(r.data)),
  update: (id: number, data: Record<string, unknown>) =>
    apiClient.put(`/maintenance/${id}`, data).then((r) => unwrap<any>(r.data)),
  delete: (id: number) => apiClient.delete(`/maintenance/${id}`).then((r) => unwrap<any>(r.data)),
};
