/**
 * Trip API Service
 */
import { http } from './http';
import { API } from './endpoints';
import type {
  Trip,
  CreateTripDto,
  UpdateTripDto,
  QueryTripDto,
  PaginatedResponse,
  ApiResponse,
} from '@/types';

function buildQueryString(params?: QueryTripDto): string {
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

// Note: CreateTripDto and UpdateTripDto need to be defined in trip types if not already
export interface CreateTripDto {
  vehicleId: number;
  driverId?: number;
  startTime: string;
  startLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}

export interface UpdateTripDto {
  status?: 'active' | 'completed' | 'cancelled';
  endTime?: string;
  endLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}

export const tripServices = {
  list: async (params?: QueryTripDto): Promise<PaginatedResponse<Trip>> => {
    const query = buildQueryString(params);
    return http.get<PaginatedResponse<Trip>>(`${API.TRIPS.LIST}${query}`);
  },

  getById: async (id: number | string): Promise<ApiResponse<Trip>> => {
    return http.get<ApiResponse<Trip>>(API.TRIPS.DETAILS(id));
  },

  create: async (data: CreateTripDto): Promise<ApiResponse<Trip>> => {
    return http.post<ApiResponse<Trip>>(API.TRIPS.CREATE, data);
  },

  update: async (id: number | string, data: UpdateTripDto): Promise<ApiResponse<Trip>> => {
    return http.put<ApiResponse<Trip>>(API.TRIPS.UPDATE(id), data);
  },

  delete: async (id: number | string): Promise<void> => {
    await http.delete(API.TRIPS.DELETE(id));
  },
};

