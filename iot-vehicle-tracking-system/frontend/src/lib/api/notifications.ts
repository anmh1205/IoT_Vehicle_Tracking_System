/**
 * Notification API Service
 */
import { http } from './http';
import { API } from './endpoints';
import type {
  Notification,
  QueryNotificationDto,
  PaginatedResponse,
  ApiResponse,
} from '@/types';

function buildQueryString(params?: QueryNotificationDto): string {
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

export const notificationServices = {
  list: async (params?: QueryNotificationDto): Promise<PaginatedResponse<Notification>> => {
    const query = buildQueryString(params);
    return http.get<PaginatedResponse<Notification>>(`${API.NOTIFICATIONS.LIST}${query}`);
  },

  getById: async (id: number | string): Promise<ApiResponse<Notification>> => {
    return http.get<ApiResponse<Notification>>(API.NOTIFICATIONS.DETAILS(id));
  },

  // Backend has PATCH /:id/delivered
  markDelivered: async (id: number | string): Promise<ApiResponse<Notification>> => {
    return http.patch<ApiResponse<Notification>>(API.NOTIFICATIONS.MARK_DELIVERED(id));
  },

  // Backend has POST /:id/retry
  retry: async (id: number | string): Promise<ApiResponse<Notification>> => {
    return http.post<ApiResponse<Notification>>(API.NOTIFICATIONS.RETRY(id));
  },
};

