import { apiClient } from './client';
import type {
  Geofence,
  CreateGeofenceInput,
  UpdateGeofenceInput,
} from '@/types/geofence.types';
import type { ApiResponse, PaginatedResponse } from '@/types';

export const geofencesApi = {
  list: (params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<PaginatedResponse<Geofence>>>('/geofences', { params }),

  getById: (id: number) =>
    apiClient.get<ApiResponse<Geofence>>(`/geofences/${id}`),

  create: (data: CreateGeofenceInput) =>
    apiClient.post<ApiResponse<Geofence>>('/geofences', data),

  update: (id: number, data: UpdateGeofenceInput) =>
    apiClient.put<ApiResponse<Geofence>>(`/geofences/${id}`, data),

  delete: (id: number) =>
    apiClient.delete(`/geofences/${id}`),

  assignVehicles: (id: number, vehicleIds: string[]) =>
    apiClient.post(`/geofences/${id}/vehicles`, { vehicleIds }),
};
