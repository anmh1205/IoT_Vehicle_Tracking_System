import { apiClient, unwrap } from './client';
import { toApiUrl } from './base-url';

export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ExportJob {
  id: number;
  exportType: string;
  status: ExportStatus;
  filters: Record<string, unknown> | null;
  filePath: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface CreateExportInput {
  exportType: string;
  filters?: Record<string, unknown>;
}

export type CreateExportPayload = CreateExportInput | (CreateExportInput & Record<string, unknown>);

export interface ExportListResponse {
  items: ExportJob[];
}

const toExportJob = (raw: any): ExportJob => ({
  id: Number(raw?.id ?? 0),
  exportType: String(raw?.exportType ?? raw?.export_type ?? ''),
  status: (raw?.status ?? 'pending') as ExportStatus,
  filters: raw?.filters ?? null,
  filePath: raw?.filePath ?? raw?.file_path ?? null,
  createdAt: String(raw?.createdAt ?? raw?.created_at ?? new Date().toISOString()),
  completedAt: raw?.completedAt ?? raw?.completed_at ?? null,
});

const toExportList = (payload: any): ExportListResponse => {
  const rows = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.data?.items)
      ? payload.data.items
      : Array.isArray(payload)
        ? payload
        : [];

  return {
    items: rows.map(toExportJob),
  };
};

export const exportServices = {
  getList: (params?: Record<string, unknown>) =>
    apiClient
      .get('/exports', { params })
      .then((response) => toExportList(unwrap<any>(response.data))),

  create: (input: CreateExportPayload) => {
    const { exportType, filters, ...rest } = input;
    const normalizedFilters = filters ?? (Object.keys(rest).length > 0 ? rest : undefined);

    return apiClient
      .post('/exports', {
        exportType,
        filters: normalizedFilters,
      })
      .then((response) => toExportJob(unwrap<any>(response.data)));
  },

  getById: (id: number | string) =>
    apiClient.get(`/exports/${id}`).then((response) => toExportJob(unwrap<any>(response.data))),

  downloadUrl: (id: number | string) => toApiUrl(`/exports/${id}/download`),
};
