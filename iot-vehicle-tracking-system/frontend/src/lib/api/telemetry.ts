/**
 * Telemetry API Service
 */
import { http } from './http';
import { API } from './endpoints';
import type {
  TelemetryData,
  TelemetryHistory,
  LiveLocation,
  QueryTelemetryDto,
  ApiResponse,
} from '@/types';

function buildQueryString(params?: QueryTelemetryDto): string {
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

export const telemetryServices = {
  // Get location data for a device
  getLocation: async (params: QueryTelemetryDto): Promise<ApiResponse<TelemetryData[]>> => {
    const query = buildQueryString(params);
    return http.get<ApiResponse<TelemetryData[]>>(`${API.TELEMETRY.LOCATION}${query}`);
  },

  // Get telemetry history for a vehicle
  getHistory: async (params: QueryTelemetryDto): Promise<ApiResponse<TelemetryHistory>> => {
    const query = buildQueryString(params);
    return http.get<ApiResponse<TelemetryHistory>>(`${API.TELEMETRY.HISTORY}${query}`);
  },
};

