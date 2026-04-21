import * as dashboardRepo from '@/domain/dashboard/repositories/dashboard.repository';
import type {
  DashboardStats,
  ActivityEvent,
  ActivityQuery,
  DashboardDeviceActivityPoint,
  DashboardDeviceStatusPoint,
  DashboardFleetRuntimePoint,
} from '@/domain/dashboard/types/dashboard.types';

export const getStats = async (): Promise<DashboardStats> => {
  const [statusCounts, runtimeToday, runtimeWeek, alertsCount, sessionsToday] = await Promise.all([
    dashboardRepo.getDeviceStatusCounts(),
    dashboardRepo.getTotalRuntimeToday(),
    dashboardRepo.getTotalRuntimeWeek(),
    dashboardRepo.getActiveAlertsCount(),
    dashboardRepo.getSessionsToday(),
  ]);

  const totalDevices = Object.values(statusCounts).reduce((sum, value) => sum + value, 0);
  const activeDevices = (statusCounts['running'] ?? 0) + (statusCounts['online'] ?? 0);
  const toHours = (seconds: number) => Number((seconds / 3600).toFixed(2));

  return {
    totalDevices,
    activeDevices,
    stoppedDevices: statusCounts['stopped'] ?? 0,
    offlineDevices: statusCounts['disconnected'] ?? 0,
    totalRuntimeToday: toHours(runtimeToday),
    totalRuntimeWeek: toHours(runtimeWeek),
    alertsCount,
    sessionsToday,
  };
};

export const getActivity = async (
  query: ActivityQuery,
): Promise<{ events: ActivityEvent[]; total: number; page: number; limit: number }> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  const result = await dashboardRepo.getActivityEvents(query);

  const events: ActivityEvent[] = result.events.map((row) => ({
    id: row.id,
    correlationId: row.correlation_id,
    deviceId: row.device_id,
    eventType: row.event_type,
    eventCode: row.event_code,
    severity: row.severity,
    message: row.message,
    serverTimestamp: row.server_timestamp.toISOString(),
  }));

  return { events, total: result.total, page, limit };
};

export const getDeviceActivity = async (days: number): Promise<DashboardDeviceActivityPoint[]> => {
  const rows = await dashboardRepo.getDeviceActivitySeries(days);
  return rows.map((row) => ({
    label: row.label,
    running: Number.parseInt(row.running, 10) || 0,
    idle: Number.parseInt(row.idle, 10) || 0,
    offline: Number.parseInt(row.offline, 10) || 0,
  }));
};

export const getDeviceStatus = async (): Promise<DashboardDeviceStatusPoint[]> => {
  const rows = await dashboardRepo.getDeviceStatusDistribution();
  return rows.map((row) => ({
    name: row.status_name,
    value: Number.parseInt(row.count, 10) || 0,
    color: row.color,
  }));
};

export const getFleetRuntime = async (days: number): Promise<DashboardFleetRuntimePoint[]> => {
  const rows = await dashboardRepo.getFleetRuntimeSeries(days);
  return rows.map((row) => ({
    label: row.label,
    runtime: Number.parseFloat(row.runtime_hours) || 0,
  }));
};
