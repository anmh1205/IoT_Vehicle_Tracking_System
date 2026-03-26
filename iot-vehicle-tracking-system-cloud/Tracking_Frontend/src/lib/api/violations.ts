import { apiClient, unwrap } from './client';

export const violationServices = {
  getList: (params?: Record<string, unknown>) =>
    apiClient.get('/violations', { params }).then((r) => unwrap<any>(r.data)),
  getById: (id: number) =>
    apiClient.get(`/violations/${id}`).then((r) => unwrap<any>(r.data)),
  create: (data: Record<string, unknown>) =>
    apiClient.post('/violations', data).then((r) => unwrap<any>(r.data)),
  acknowledge: (id: number, data?: Record<string, unknown>) =>
    apiClient.put(`/violations/${id}/acknowledge`, data ?? {}).then((r) => unwrap<any>(r.data)),
};
