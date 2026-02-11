import { apiClient, unwrap } from './client';

export const statisticsServices = {
  getFleetUsage: (params?: Record<string, unknown>) =>
    apiClient.get('/statistics/fleet-usage', { params }).then((r) => unwrap<any>(r.data)),
  getDeviceUptime: (params?: Record<string, unknown>) =>
    apiClient.get('/statistics/device-uptime', { params }).then((r) => unwrap<any>(r.data)),
  getAlertFrequency: (params?: Record<string, unknown>) =>
    apiClient.get('/statistics/alert-frequency', { params }).then((r) => unwrap<any>(r.data)),
  getTripSummary: (params?: Record<string, unknown>) =>
    apiClient.get('/statistics/trip-summary', { params }).then((r) => unwrap<any>(r.data)),
};
