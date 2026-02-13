import { apiClient, unwrap } from './client';

export const vehicleServices = {
  getList: (params?: Record<string, unknown>) =>
    apiClient.get('/vehicles', { params }).then((r) => unwrap<any>(r.data)),
  getById: (id: number) => apiClient.get(`/vehicles/${id}`).then((r) => unwrap<any>(r.data)),
  create: (data: Record<string, unknown>) =>
    apiClient.post('/vehicles', data).then((r) => unwrap<any>(r.data)),
  update: (id: number, data: Record<string, unknown>) =>
    apiClient.put(`/vehicles/${id}`, data).then((r) => unwrap<any>(r.data)),
  delete: (id: number) => apiClient.delete(`/vehicles/${id}`).then((r) => unwrap<any>(r.data)),
  assignDevice: (id: number, deviceId: string | null) =>
    apiClient.put(`/vehicles/${id}/device`, { deviceId }).then((r) => unwrap<any>(r.data)),
};
