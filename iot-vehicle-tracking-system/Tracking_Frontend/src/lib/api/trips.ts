import { apiClient, unwrap } from './client';

export const tripServices = {
  getList: (params?: Record<string, unknown>) =>
    apiClient.get('/trips', { params }).then((r) => unwrap<any>(r.data)),
  getById: (id: number) => apiClient.get(`/trips/${id}`).then((r) => unwrap<any>(r.data)),
  getTelemetry: (id: number, params?: { interval?: string }) =>
    apiClient.get(`/trips/${id}/telemetry`, { params }).then((r) => unwrap<any>(r.data)),
  create: (data: Record<string, unknown>) =>
    apiClient.post('/trips', data).then((r) => unwrap<any>(r.data)),
  update: (id: number, data: Record<string, unknown>) =>
    apiClient.put(`/trips/${id}`, data).then((r) => unwrap<any>(r.data)),
  delete: (id: number) => apiClient.delete(`/trips/${id}`).then((r) => unwrap<any>(r.data)),
  start: (id: number) => apiClient.put(`/trips/${id}/start`).then((r) => unwrap<any>(r.data)),
  end: (id: number) => apiClient.put(`/trips/${id}/end`).then((r) => unwrap<any>(r.data)),
};
