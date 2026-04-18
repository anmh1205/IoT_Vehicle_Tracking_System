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
  summaryStatus: string;
  progress: number | null;
  targetVersion: string | null;
  currentVersion: string | null;
  partition: string | null;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
  firstAssignedAt: string | null;
  commandDispatchedAt: string | null;
  lastSeenAt: string | null;
  lastSeqNo: number | null;
  lastMessageId: string | null;
  lastBootId: string | null;
  isStuck: boolean;
  stuckReason: string | null;
  errorCode: string | null;
  errorMessage: string | null;
}

const normalizeFirmwareRecord = (payload: any): FirmwareRecord => ({
  id: Number(payload?.id ?? 0),
  version: String(payload?.version ?? ''),
  filename: String(payload?.filename ?? ''),
  filePath: String(payload?.filePath ?? payload?.file_path ?? ''),
  size: Number(payload?.size ?? 0),
  description: payload?.description ? String(payload.description) : null,
  isActive: Boolean(payload?.isActive ?? payload?.is_active),
  createdAt: String(payload?.createdAt ?? payload?.created_at ?? ''),
});

const normalizeFirmwareList = (payload: any): FirmwareListResponse => {
  const rows = Array.isArray(payload?.firmwares)
    ? payload.firmwares
    : Array.isArray(payload?.items)
      ? payload.items
      : [];

  return {
    firmwares: rows.map((row: any) => normalizeFirmwareRecord(row)),
    total: Number(payload?.total ?? payload?.pagination?.total ?? rows.length),
    page: Number(payload?.page ?? payload?.pagination?.page ?? 1),
    limit: Number(payload?.limit ?? payload?.pagination?.limit ?? rows.length),
  };
};

export const firmwareServices = {
  getList: (params?: Record<string, unknown>) =>
    apiClient
      .get('/firmware', { params })
      .then((r) => normalizeFirmwareList(unwrap<any>(r.data))),
  getById: (id: number) =>
    apiClient.get(`/firmware/${id}`).then((r) => normalizeFirmwareRecord(unwrap<any>(r.data))),
  upload: (data: FormData | Record<string, unknown>) =>
    apiClient
      .post('/firmware/upload', data, {
        headers:
          typeof FormData !== 'undefined' && data instanceof FormData
            ? { 'Content-Type': 'multipart/form-data' }
            : undefined,
      })
      .then((r) => normalizeFirmwareRecord(unwrap<any>(r.data))),
  create: (data: Record<string, unknown>) =>
    apiClient.post('/firmware', data).then((r) => normalizeFirmwareRecord(unwrap<any>(r.data))),
  delete: (id: number) => apiClient.delete(`/firmware/${id}`).then((r) => unwrap<any>(r.data)),
  activate: (id: number) =>
    apiClient
      .post(`/firmware/${id}/activate`)
      .then((r) => normalizeFirmwareRecord(unwrap<any>(r.data))),
  deactivate: (id: number) =>
    apiClient
      .post(`/firmware/${id}/deactivate`)
      .then((r) => normalizeFirmwareRecord(unwrap<any>(r.data))),
  deploy: (id: number, data: { deviceIds: string[]; strategy: 'rolling' | 'all_at_once' }) =>
    apiClient.post(`/firmware/${id}/deploy`, data).then((r) => unwrap<any>(r.data)),
  getDeployments: (id: number) =>
    apiClient.get(`/firmware/${id}/deployments`).then((r) => unwrap<FirmwareDeployment[]>(r.data)),
};
