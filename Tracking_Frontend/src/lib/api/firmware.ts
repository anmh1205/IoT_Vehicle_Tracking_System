import { apiClient } from './client';
import type { Firmware } from '@/types/firmware.types';
import type { ApiResponse, PaginatedResponse } from '@/types';

export const firmwareApi = {
  list: (params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<PaginatedResponse<Firmware>>>('/firmware', { params }),
  getById: (id: number) =>
    apiClient.get<ApiResponse<Firmware>>(`/firmware/${id}`),
  create: (data: FormData) =>
    apiClient.post<ApiResponse<Firmware>>('/firmware', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (id: number) =>
    apiClient.delete(`/firmware/${id}`),
  activate: (id: number) =>
    apiClient.put(`/firmware/${id}/activate`),
  deactivate: (id: number) =>
    apiClient.put(`/firmware/${id}/deactivate`),
};
