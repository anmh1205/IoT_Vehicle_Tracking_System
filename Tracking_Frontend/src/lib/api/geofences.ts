import { apiClient, unwrap } from './client';

export const geofenceServices = {
  getList: (params?: Record<string, unknown>) =>
    apiClient.get('/geofences', { params }).then((r) => unwrap<any>(r.data)),
  getById: (id: number) => apiClient.get(`/geofences/${id}`).then((r) => unwrap<any>(r.data)),
  create: (data: Record<string, unknown>) =>
    apiClient.post('/geofences', data).then((r) => unwrap<any>(r.data)),
  update: (id: number, data: Record<string, unknown>) =>
    apiClient.put(`/geofences/${id}`, data).then((r) => unwrap<any>(r.data)),
  delete: (id: number) => apiClient.delete(`/geofences/${id}`).then((r) => unwrap<any>(r.data)),
  bindVehicles: (id: number, vehicleIds: number[]) =>
    apiClient.post(`/geofences/${id}/vehicles`, { vehicleIds }).then((r) => unwrap<any>(r.data)),
};
