import { apiClient } from './client';
import type { DashboardStats, ActivityEvent } from '@/types/dashboard.types';
import type { ApiResponse, PaginatedResponse } from '@/types';

export const dashboardApi = {
  getStats: () =>
    apiClient.get<ApiResponse<DashboardStats>>('/dashboard/stats'),
  getActivity: (params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<PaginatedResponse<ActivityEvent>>>('/dashboard/activity', { params }),
};
