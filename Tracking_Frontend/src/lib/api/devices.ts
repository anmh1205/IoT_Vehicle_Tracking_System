import { apiClient } from './client';
import type {
  Device,
  DeviceDetail,
  DevicePosition,
  CreateDeviceInput,
  UpdateDeviceInput,
  DeviceListQuery,
} from '@/types/device.types';
import type { ApiResponse, PaginatedResponse } from '@/types';

export const devicesApi = {
  list: (params?: DeviceListQuery) =>
    apiClient.get<ApiResponse<PaginatedResponse<Device>>>('/devices', { params }),

  getById: (id: number) =>
    apiClient.get<ApiResponse<DeviceDetail>>(`/devices/${id}`),

  create: (data: CreateDeviceInput) =>
    apiClient.post<ApiResponse<Device & { authToken: string }>>('/devices', data),

  update: (id: number, data: UpdateDeviceInput) =>
    apiClient.put<ApiResponse<Device>>(`/devices/${id}`, data),

  delete: (id: number) =>
    apiClient.delete(`/devices/${id}`),

  getPositions: () =>
    apiClient.get<ApiResponse<DevicePosition[]>>('/devices/positions'),

  regenerateToken: (id: number) =>
    apiClient.post<ApiResponse<{ authToken: string }>>(`/devices/${id}/regenerate-token`),
};
