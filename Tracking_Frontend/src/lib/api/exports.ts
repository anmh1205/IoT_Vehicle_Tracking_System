import { apiClient } from './client';
import type { ExportJob } from '@/types/export.types';
import type { ApiResponse } from '@/types';

export const exportsApi = {
  list: () =>
    apiClient.get<ApiResponse<ExportJob[]>>('/exports'),
  create: (data: { exportType: string; filters?: Record<string, unknown> }) =>
    apiClient.post<ApiResponse<ExportJob>>('/exports', data),
  getStatus: (id: number) =>
    apiClient.get<ApiResponse<ExportJob>>(`/exports/${id}`),
};
