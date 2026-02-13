import { apiClient, unwrap } from './client';

export interface DeviceFilters {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const deviceServices = {
  getList: (params?: DeviceFilters) =>
    apiClient.get('/devices', { params }).then((r) => unwrap<any>(r.data)),
  getById: (id: number | string) =>
    apiClient.get(`/devices/${id}`).then((r) => unwrap<any>(r.data)),
  create: (data: Record<string, unknown>) =>
    apiClient.post('/devices', data).then((r) => unwrap<any>(r.data)),
  update: (id: number, data: Record<string, unknown>) =>
    apiClient.put(`/devices/${id}`, data).then((r) => unwrap<any>(r.data)),
  delete: (id: number) => apiClient.delete(`/devices/${id}`).then((r) => unwrap<any>(r.data)),
  getSessions: (id: number | string, params?: { page?: number; limit?: number }) =>
    apiClient.get(`/devices/${id}/sessions`, { params }).then((r) => unwrap<any>(r.data)),
  getTelemetry: (id: number | string, params?: { metric?: string; from?: string; to?: string }) =>
    apiClient.get(`/devices/${id}/telemetry`, { params }).then((r) => unwrap<any>(r.data)),
  sendCommand: (id: number | string, data: { command: string; params?: Record<string, unknown> }) =>
    apiClient.post(`/devices/${id}/command`, data).then((r) => unwrap<any>(r.data)),
  getCommands: (id: number | string, params?: { page?: number; limit?: number }) =>
    apiClient.get(`/devices/${id}/commands`, { params }).then((r) => unwrap<any>(r.data)),
  getErrors: (id: number | string, params?: { page?: number; limit?: number }) =>
    apiClient.get(`/devices/${id}/errors`, { params }).then((r) => unwrap<any>(r.data)),
  getPositions: () => apiClient.get('/devices/positions').then((r) => unwrap<any>(r.data)),
};
