import { apiClient } from './client';
import type { Vehicle, CreateVehicleInput, UpdateVehicleInput, VehicleListQuery } from '@/types/vehicle.types';
import type { ApiResponse, PaginatedResponse } from '@/types';

export const vehiclesApi = {
  list: (params?: VehicleListQuery) =>
    apiClient.get<ApiResponse<PaginatedResponse<Vehicle>>>('/vehicles', { params }),

  getById: (id: number) =>
    apiClient.get<ApiResponse<Vehicle>>(`/vehicles/${id}`),

  create: (data: CreateVehicleInput) =>
    apiClient.post<ApiResponse<Vehicle>>('/vehicles', data),

  update: (id: number, data: UpdateVehicleInput) =>
    apiClient.put<ApiResponse<Vehicle>>(`/vehicles/${id}`, data),

  delete: (id: number) =>
    apiClient.delete(`/vehicles/${id}`),

  assignDevice: (id: number, deviceId: string) =>
    apiClient.patch<ApiResponse<Vehicle>>(`/vehicles/${id}/assign-device`, { deviceId }),

  unassignDevice: (id: number) =>
    apiClient.patch<ApiResponse<Vehicle>>(`/vehicles/${id}/unassign-device`),
};
