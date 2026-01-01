/**
 * Alert API Service
 */
import { http } from './http';
import { API } from './endpoints';
import type {
  Alert,
  CreateAlertDto,
  AcknowledgeAlertDto,
  ResolveAlertDto,
  QueryAlertDto,
  PaginatedResponse,
  ApiResponse,
} from '@/types';

function buildQueryString(params?: QueryAlertDto): string {
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

export interface CreateAlertDto {
  vehicleId: number;
  type: 'speeding' | 'geofence_enter' | 'geofence_exit' | 'harsh_braking' | 'harsh_acceleration' | 'idle' | 'low_battery' | 'device_offline';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export const alertServices = {
  list: async (params?: QueryAlertDto): Promise<PaginatedResponse<Alert>> => {
    const query = buildQueryString(params);
    return http.get<PaginatedResponse<Alert>>(`${API.ALERTS.LIST}${query}`);
  },

  getById: async (id: number | string): Promise<ApiResponse<Alert>> => {
    return http.get<ApiResponse<Alert>>(API.ALERTS.DETAILS(id));
  },

  create: async (data: CreateAlertDto): Promise<ApiResponse<Alert>> => {
    return http.post<ApiResponse<Alert>>(API.ALERTS.CREATE, data);
  },

  acknowledge: async (id: number | string, data: AcknowledgeAlertDto): Promise<ApiResponse<Alert>> => {
    return http.post<ApiResponse<Alert>>(API.ALERTS.ACKNOWLEDGE(id), data);
  },

  resolve: async (id: number | string, data: ResolveAlertDto): Promise<ApiResponse<Alert>> => {
    return http.post<ApiResponse<Alert>>(API.ALERTS.RESOLVE(id), data);
  },
};

