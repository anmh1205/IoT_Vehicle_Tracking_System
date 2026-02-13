import { apiClient, unwrap } from './client';

export const firmwareServices = {
  getList: (params?: Record<string, unknown>) =>
    apiClient.get('/firmware', { params }).then((r) => unwrap<any>(r.data)),
  getById: (id: number) => apiClient.get(`/firmware/${id}`).then((r) => unwrap<any>(r.data)),
  upload: (data: Record<string, unknown>) =>
    apiClient.post('/firmware/upload', data).then((r) => unwrap<any>(r.data)),
  create: (data: Record<string, unknown>) =>
    apiClient.post('/firmware', data).then((r) => unwrap<any>(r.data)),
  delete: (id: number) => apiClient.delete(`/firmware/${id}`).then((r) => unwrap<any>(r.data)),
  deploy: (id: number, data: { deviceIds: string[]; strategy: 'rolling' | 'all_at_once' }) =>
    apiClient.post(`/firmware/${id}/deploy`, data).then((r) => unwrap<any>(r.data)),
  getDeployments: (id: number) =>
    apiClient.get(`/firmware/${id}/deployments`).then((r) => unwrap<any>(r.data)),
};
