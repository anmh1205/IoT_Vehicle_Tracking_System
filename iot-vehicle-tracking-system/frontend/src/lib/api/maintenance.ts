/**
 * Maintenance API Service
 */
import { http } from './http';
import { API } from './endpoints';
import type {
  Maintenance,
  CreateMaintenanceDto,
  UpdateMaintenanceDto,
  QueryMaintenanceDto,
  PaginatedResponse,
  ApiResponse,
} from '@/types';

function buildQueryString(params?: QueryMaintenanceDto): string {
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

export const maintenanceServices = {
  list: async (params?: QueryMaintenanceDto): Promise<PaginatedResponse<Maintenance>> => {
    const query = buildQueryString(params);
    return http.get<PaginatedResponse<Maintenance>>(`${API.MAINTENANCE.LIST}${query}`);
  },

  getById: async (id: number | string): Promise<ApiResponse<Maintenance>> => {
    return http.get<ApiResponse<Maintenance>>(API.MAINTENANCE.DETAILS(id));
  },

  create: async (data: CreateMaintenanceDto): Promise<ApiResponse<Maintenance>> => {
    return http.post<ApiResponse<Maintenance>>(API.MAINTENANCE.CREATE, data);
  },

  update: async (id: number | string, data: UpdateMaintenanceDto): Promise<ApiResponse<Maintenance>> => {
    return http.put<ApiResponse<Maintenance>>(API.MAINTENANCE.UPDATE(id), data);
  },

  delete: async (id: number | string): Promise<void> => {
    await http.delete(API.MAINTENANCE.DELETE(id));
  },
};

