import { apiClient, unwrap } from './client';

export interface DashboardStats {
  totalDevices: number;
  activeDevices: number;
  offlineDevices: number;
  alertsCount: number;
  totalRuntimeToday: number;
  totalRuntimeWeek: number;
  sessionsToday: number;
}

export const dashboardServices = {
  getStats: () => apiClient.get('/dashboard/stats').then((r) => unwrap<DashboardStats>(r.data)),
  getActivity: (params?: Record<string, unknown>) =>
    apiClient.get('/dashboard/activity', { params }).then((r) => unwrap<any>(r.data)),
};
