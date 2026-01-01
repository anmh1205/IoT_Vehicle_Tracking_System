/**
 * Command API Service
 */
import { http } from './http';
import { API } from './endpoints';
import type {
  Command,
  SendCommandDto,
  QueryCommandDto,
  PaginatedResponse,
  ApiResponse,
} from '@/types';

function buildQueryString(params?: QueryCommandDto): string {
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

export const commandServices = {
  list: async (params?: QueryCommandDto): Promise<PaginatedResponse<Command>> => {
    const query = buildQueryString(params);
    return http.get<PaginatedResponse<Command>>(`${API.COMMANDS.LIST}${query}`);
  },

  getById: async (id: number | string): Promise<ApiResponse<Command>> => {
    return http.get<ApiResponse<Command>>(API.COMMANDS.DETAILS(id));
  },

  // Backend route: POST /commands/:deviceId
  send: async (deviceId: string, data: SendCommandDto): Promise<ApiResponse<Command>> => {
    return http.post<ApiResponse<Command>>(API.COMMANDS.SEND(deviceId), data);
  },
};

