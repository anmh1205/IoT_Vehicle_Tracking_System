import * as dashboardRepo from '@/domain/dashboard/repositories/dashboard.repository';
import type { DashboardStats, ActivityEvent, ActivityQuery } from '@/domain/dashboard/types/dashboard.types';

export const getStats = async (): Promise<DashboardStats> => {
  const [statusCounts, runtimeToday, runtimeWeek, alertsCount, sessionsToday] =
    await Promise.all([
      dashboardRepo.getDeviceStatusCounts(),
      dashboardRepo.getTotalRuntimeToday(),
      dashboardRepo.getTotalRuntimeWeek(),
      dashboardRepo.getActiveAlertsCount(),
      dashboardRepo.getSessionsToday(),
    ]);

  return {
    totalDevices:
      (statusCounts['running'] ?? 0) +
      (statusCounts['stopped'] ?? 0) +
      (statusCounts['disconnected'] ?? 0),
    activeDevices: statusCounts['running'] ?? 0,
    stoppedDevices: statusCounts['stopped'] ?? 0,
    offlineDevices: statusCounts['disconnected'] ?? 0,
    totalRuntimeToday: runtimeToday,
    totalRuntimeWeek: runtimeWeek,
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
