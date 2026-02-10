import { apiClient } from './client';
import type { Alert, CreateAlertInput, UpdateAlertInput, AlertListQuery } from '@/types/alert.types';
import type { ApiResponse, PaginatedResponse } from '@/types';

export const alertsApi = {
  list: (params?: AlertListQuery) =>
    apiClient.get<ApiResponse<PaginatedResponse<Alert>>>('/alerts', { params }),

  getById: (id: number) =>
    apiClient.get<ApiResponse<Alert>>(`/alerts/${id}`),

  create: (data: CreateAlertInput) =>
    apiClient.post<ApiResponse<Alert>>('/alerts', data),

  update: (id: number, data: UpdateAlertInput) =>
    apiClient.put<ApiResponse<Alert>>(`/alerts/${id}`, data),

  acknowledge: (id: number) =>
    apiClient.patch<ApiResponse<Alert>>(`/alerts/${id}/acknowledge`),

  resolve: (id: number, notes?: string) =>
    apiClient.patch<ApiResponse<Alert>>(`/alerts/${id}/resolve`, { resolutionNotes: notes }),

  dismiss: (id: number) =>
    apiClient.patch<ApiResponse<Alert>>(`/alerts/${id}/dismiss`),
};
