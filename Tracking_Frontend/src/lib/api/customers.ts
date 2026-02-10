import { apiClient, unwrap } from './client';

export const customerServices = {
  getList: (params?: Record<string, unknown>) => apiClient.get('/customers', { params }).then((r) => unwrap<any>(r.data)),
  getById: (id: number) => apiClient.get(`/customers/${id}`).then((r) => unwrap<any>(r.data)),
  create: (data: Record<string, unknown>) => apiClient.post('/customers', data).then((r) => unwrap<any>(r.data)),
  update: (id: number, data: Record<string, unknown>) => apiClient.put(`/customers/${id}`, data).then((r) => unwrap<any>(r.data)),
  delete: (id: number) => apiClient.delete(`/customers/${id}`).then((r) => unwrap<any>(r.data)),
};
