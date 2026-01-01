/**
 * Geofence API Service
 */
import { http } from './http';
import { API } from './endpoints';
import type {
  Geofence,
  CreateGeofenceDto,
  UpdateGeofenceDto,
  AssignVehiclesToGeofenceDto,
  QueryGeofenceDto,
  PaginatedResponse,
  ApiResponse,
} from '@/types';

function buildQueryString(params?: QueryGeofenceDto): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export const geofenceServices = {
  list: async (params?: QueryGeofenceDto): Promise<PaginatedResponse<Geofence>> => {
    const query = buildQueryString(params);
    return http.get<PaginatedResponse<Geofence>>(`${API.GEOFENCES.LIST}${query}`);
  },

  getById: async (id: number | string): Promise<ApiResponse<Geofence>> => {
    return http.get<ApiResponse<Geofence>>(API.GEOFENCES.DETAILS(id));
  },

  create: async (data: CreateGeofenceDto): Promise<ApiResponse<Geofence>> => {
    return http.post<ApiResponse<Geofence>>(API.GEOFENCES.CREATE, data);
  },

  update: async (id: number | string, data: UpdateGeofenceDto): Promise<ApiResponse<Geofence>> => {
    return http.put<ApiResponse<Geofence>>(API.GEOFENCES.UPDATE(id), data);
  },

  delete: async (id: number | string): Promise<void> => {
    await http.delete(API.GEOFENCES.DELETE(id));
  },

  assignVehicles: async (id: number | string, data: AssignVehiclesToGeofenceDto): Promise<ApiResponse<Geofence>> => {
    return http.post<ApiResponse<Geofence>>(API.GEOFENCES.ASSIGN_VEHICLES(id), data);
  },
};

