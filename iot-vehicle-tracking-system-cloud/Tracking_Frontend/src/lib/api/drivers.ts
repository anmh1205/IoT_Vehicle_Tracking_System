import { apiClient, unwrap } from './client';

export const driverServices = {
  getList: (params?: Record<string, unknown>) =>
    apiClient.get('/drivers', { params }).then((r) => unwrap<any>(r.data)),
  getById: (id: number) =>
    apiClient.get(`/drivers/${id}`).then((r) => unwrap<any>(r.data)),
  create: (data: Record<string, unknown>) =>
    apiClient.post('/drivers', data).then((r) => unwrap<any>(r.data)),
  update: (id: number, data: Record<string, unknown>) =>
    apiClient.put(`/drivers/${id}`, data).then((r) => unwrap<any>(r.data)),
  delete: (id: number) =>
    apiClient.delete(`/drivers/${id}`).then((r) => unwrap<any>(r.data)),
};
