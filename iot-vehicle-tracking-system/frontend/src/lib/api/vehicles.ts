/**
 * Vehicle API Service
 */
import { http } from './http';
import { API } from './endpoints';
import type {
  Vehicle,
  CreateVehicleDto,
  UpdateVehicleDto,
  QueryVehicleDto,
  VehicleLocation,
  PaginatedResponse,
  ApiResponse,
} from '@/types';

// Build query string from params
function buildQueryString(params?: QueryVehicleDto): string {
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

export const vehicleServices = {
  // List vehicles with pagination and filters
  list: async (params?: QueryVehicleDto): Promise<PaginatedResponse<Vehicle>> => {
    const query = buildQueryString(params);
    return http.get<PaginatedResponse<Vehicle>>(`${API.VEHICLES.LIST}${query}`);
  },

  // Get vehicle by ID
  getById: async (id: number | string): Promise<ApiResponse<Vehicle>> => {
    return http.get<ApiResponse<Vehicle>>(API.VEHICLES.DETAILS(id));
  },

  // Create new vehicle
  create: async (data: CreateVehicleDto): Promise<ApiResponse<Vehicle>> => {
    return http.post<ApiResponse<Vehicle>>(API.VEHICLES.CREATE, data);
  },

  // Update vehicle
  update: async (id: number | string, data: UpdateVehicleDto): Promise<ApiResponse<Vehicle>> => {
    return http.patch<ApiResponse<Vehicle>>(API.VEHICLES.UPDATE(id), data);
  },

  // Delete vehicle
  delete: async (id: number | string): Promise<void> => {
    await http.delete(API.VEHICLES.DELETE(id));
  },

  // Get vehicle status/location
  getStatus: async (id: number | string): Promise<ApiResponse<VehicleLocation>> => {
    return http.get<ApiResponse<VehicleLocation>>(API.VEHICLES.STATUS(id));
  },
};

