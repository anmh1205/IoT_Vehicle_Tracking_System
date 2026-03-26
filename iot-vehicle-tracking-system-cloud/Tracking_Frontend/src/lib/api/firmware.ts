import { apiClient, unwrap } from './client';

export interface FirmwareRecord {
  id: number;
  version: string;
  filename: string;
  filePath: string;
  size: number;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface FirmwareListResponse {
  firmwares: FirmwareRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface FirmwareDeployment {
  id: number;
  jobId: string | null;
  deviceId: string;
  status: string;
  progress: number | null;
  targetVersion: string | null;
  currentVersion: string | null;
  partition: string | null;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
}

export const firmwareServices = {
  getList: (params?: Record<string, unknown>) =>
    apiClient.get('/firmware', { params }).then((r) => unwrap<FirmwareListResponse>(r.data)),
  getById: (id: number) => apiClient.get(`/firmware/${id}`).then((r) => unwrap<FirmwareRecord>(r.data)),
  upload: (data: FormData | Record<string, unknown>) =>
    apiClient
      .post('/firmware/upload', data, {
        headers:
          typeof FormData !== 'undefined' && data instanceof FormData
            ? { 'Content-Type': 'multipart/form-data' }
            : undefined,
      })
      .then((r) => unwrap<FirmwareRecord>(r.data)),
  create: (data: Record<string, unknown>) =>
    apiClient.post('/firmware', data).then((r) => unwrap<FirmwareRecord>(r.data)),
  delete: (id: number) => apiClient.delete(`/firmware/${id}`).then((r) => unwrap<any>(r.data)),
  activate: (id: number) =>
    apiClient.post(`/firmware/${id}/activate`).then((r) => unwrap<FirmwareRecord>(r.data)),
  deactivate: (id: number) =>
    apiClient.post(`/firmware/${id}/deactivate`).then((r) => unwrap<FirmwareRecord>(r.data)),
  deploy: (id: number, data: { deviceIds: string[]; strategy: 'rolling' | 'all_at_once' }) =>
    apiClient.post(`/firmware/${id}/deploy`, data).then((r) => unwrap<any>(r.data)),
  getDeployments: (id: number) =>
    apiClient.get(`/firmware/${id}/deployments`).then((r) => unwrap<FirmwareDeployment[]>(r.data)),
};
