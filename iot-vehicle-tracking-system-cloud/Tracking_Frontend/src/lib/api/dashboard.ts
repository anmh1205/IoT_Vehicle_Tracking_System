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

export interface DashboardEvent {
  id: number;
  eventType: string;
  eventCode: string | null;
  message: string | null;
  severity: string;
  deviceId: string;
  serverTimestamp: string;
}

export interface DeviceActivityPoint {
  label: string;
  running: number;
  idle: number;
  offline: number;
}

export interface DeviceStatusPoint {
  name: string;
  value: number;
  color?: string;
}

export interface FleetRuntimePoint {
  label: string;
  runtime: number;
}

export const dashboardServices = {
  getStats: () => apiClient.get('/dashboard/stats').then((r) => unwrap<DashboardStats>(r.data)),
  getActivity: (limit: number) =>
    apiClient.get('/dashboard/activity', { params: { limit } })
      .then((r) => unwrap<{ events: DashboardEvent[] }>(r.data).events),
  getDeviceActivity: (days: number) =>
    apiClient.get('/dashboard/device-activity', { params: { days } })
      .then((r) => unwrap<{ items: DeviceActivityPoint[] }>(r.data).items),
  getDeviceStatus: () =>
    apiClient.get('/dashboard/device-status')
      .then((r) => unwrap<{ items: DeviceStatusPoint[] }>(r.data).items),
  getFleetRuntime: (days: number) =>
    apiClient.get('/dashboard/fleet-runtime', { params: { days } })
      .then((r) => unwrap<{ items: FleetRuntimePoint[] }>(r.data).items),
};
