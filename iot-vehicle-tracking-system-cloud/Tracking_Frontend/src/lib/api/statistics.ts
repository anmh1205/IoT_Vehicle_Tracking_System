import { apiClient, unwrap } from './client';

export interface StatisticsSummary {
  totalRuntimeHours: number;
  averageUptimePercent: number;
  totalSessions: number;
  totalAlerts: number;
}

export interface FleetUsageStats {
  labels: string[];
  activeVehicles: number[];
  inactiveVehicles: number[];
}

export interface DeviceUptimeStats {
  devices: Array<{
    deviceId: string;
    uptimePercent: number;
    totalHours: number;
    downHours: number;
  }>;
}

export interface AlertFrequencyStats {
  labels: string[];
  series: {
    speeding: number[];
    zone: number[];
    offline: number[];
    other: number[];
  };
}

export interface TripSummaryStats {
  labels: string[];
  totalTrips: number[];
  totalDistanceKm: number[];
  avgDuration: number[];
}

export const statisticsServices = {
  getFleetUsage: (params?: Record<string, unknown>) =>
    apiClient
      .get('/statistics/fleet-usage', { params })
      .then((r) => unwrap<FleetUsageStats>(r.data)),
  getDeviceUptime: (params?: Record<string, unknown>) =>
    apiClient
      .get('/statistics/device-uptime', { params })
      .then((r) => unwrap<DeviceUptimeStats>(r.data)),
  getAlertFrequency: (params?: Record<string, unknown>) =>
    apiClient
      .get('/statistics/alert-frequency', { params })
      .then((r) => unwrap<AlertFrequencyStats>(r.data)),
  getTripSummary: (params?: Record<string, unknown>) =>
    apiClient
      .get('/statistics/trip-summary', { params })
      .then((r) => unwrap<TripSummaryStats>(r.data)),
};
