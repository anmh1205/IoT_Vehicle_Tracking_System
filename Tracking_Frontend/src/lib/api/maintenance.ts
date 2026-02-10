import { apiClient } from './client';
import type { Maintenance, CreateMaintenanceInput, UpdateMaintenanceInput, MaintenanceListQuery } from '@/types/maintenance.types';
import type { ApiResponse, PaginatedResponse } from '@/types';

export const maintenanceApi = {
  list: (params?: MaintenanceListQuery) =>
    apiClient.get<ApiResponse<PaginatedResponse<Maintenance>>>('/maintenance', { params }),

  getById: (id: number) =>
    apiClient.get<ApiResponse<Maintenance>>(`/maintenance/${id}`),

  create: (data: CreateMaintenanceInput) =>
    apiClient.post<ApiResponse<Maintenance>>('/maintenance', data),

  update: (id: number, data: UpdateMaintenanceInput) =>
    apiClient.put<ApiResponse<Maintenance>>(`/maintenance/${id}`, data),

  delete: (id: number) =>
    apiClient.delete(`/maintenance/${id}`),
};
