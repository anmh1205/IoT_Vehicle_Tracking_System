import { apiClient, unwrap } from './client';

export const userServices = {
  getList: (params?: Record<string, unknown>) =>
    apiClient.get('/users', { params }).then((r) => unwrap<any>(r.data)),
  getById: (id: number) => apiClient.get(`/users/${id}`).then((r) => unwrap<any>(r.data)),
  create: (data: Record<string, unknown>) =>
    apiClient.post('/users', data).then((r) => unwrap<any>(r.data)),
  update: (id: number, data: Record<string, unknown>) =>
    apiClient.patch(`/users/${id}`, data).then((r) => unwrap<any>(r.data)),
  delete: (id: number) => apiClient.delete(`/users/${id}`).then((r) => unwrap<any>(r.data)),
  resetPassword: (id: number) =>
    apiClient.post(`/users/${id}/reset-password`).then((r) => unwrap<any>(r.data)),
};
