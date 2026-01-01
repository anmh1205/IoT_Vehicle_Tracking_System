/**
 * Device API Service
 */
import { http } from './http';
import { API } from './endpoints';
import type {
  Device,
  CreateDeviceDto,
  UpdateDeviceDto,
  QueryDeviceDto,
  AssignDeviceDto,
  PaginatedResponse,
  ApiResponse,
} from '@/types';

function buildQueryString(params?: QueryDeviceDto): string {
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

export const deviceServices = {
  list: async (params?: QueryDeviceDto): Promise<PaginatedResponse<Device>> => {
    const query = buildQueryString(params);
    return http.get<PaginatedResponse<Device>>(`${API.DEVICES.LIST}${query}`);
  },

  getById: async (id: number | string): Promise<ApiResponse<Device>> => {
    return http.get<ApiResponse<Device>>(API.DEVICES.DETAILS(id));
  },

  create: async (data: CreateDeviceDto): Promise<ApiResponse<Device>> => {
    return http.post<ApiResponse<Device>>(API.DEVICES.CREATE, data);
  },

  update: async (id: number | string, data: UpdateDeviceDto): Promise<ApiResponse<Device>> => {
    return http.patch<ApiResponse<Device>>(API.DEVICES.UPDATE(id), data);
  },

  delete: async (id: number | string): Promise<void> => {
    await http.delete(API.DEVICES.DELETE(id));
  },

  assignToVehicle: async (id: number | string, data: AssignDeviceDto): Promise<ApiResponse<Device>> => {
    return http.post<ApiResponse<Device>>(API.DEVICES.ASSIGN(id), data);
  },
};

