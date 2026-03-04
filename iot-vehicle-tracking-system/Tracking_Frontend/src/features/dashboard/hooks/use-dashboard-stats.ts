import { useQuery } from '@tanstack/react-query';
import { dashboardServices } from '@/lib/api/dashboard';
import { apiClient, unwrap } from '@/lib/api/client';
export interface DashboardEvent {
  id: string | number;
  eventType: string;
  message?: string | null;
  severity?: 'critical' | 'high' | 'medium' | 'low' | string;
  deviceId?: string | null;
  serverTimestamp?: string;
}
export interface DashboardOverviewStats {
  totalDevices: number;
  activeDevices: number;
  offlineDevices: number;
  alertsCount: number;
  totalRuntimeToday: number;
  totalRuntimeWeek: number;
  sessionsToday: number;
}
export interface DeviceActivityPoint {
  label: string;
  running: number;
  idle: number;
  offline: number;
}
export interface PieStatusPoint {
  name: string;
  value: number;
  color: string;
}
export interface FleetRuntimePoint {
  label: string;
  runtime: number;
}
const normalizeStats = (raw: any): DashboardOverviewStats => ({
  totalDevices: Number(raw?.totalDevices ?? raw?.total_devices ?? 0),
  activeDevices: Number(raw?.activeDevices ?? raw?.active_devices ?? 0),
  offlineDevices: Number(raw?.offlineDevices ?? raw?.offline_devices ?? 0),
  alertsCount: Number(raw?.alertsCount ?? raw?.alerts_count ?? 0),
  totalRuntimeToday: Number(raw?.totalRuntimeToday ?? raw?.total_runtime_today ?? 0),
  totalRuntimeWeek: Number(raw?.totalRuntimeWeek ?? raw?.total_runtime_week ?? 0),
  sessionsToday: Number(raw?.sessionsToday ?? raw?.sessions_today ?? 0),
});
const normalizeEvents = (payload: any): DashboardEvent[] => {
  const events = Array.isArray(payload?.events)
    ? payload.events
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.data?.events)
        ? payload.data.events
        : Array.isArray(payload?.data?.items)
          ? payload.data.items
          : [];
  return events.map((event: any, index: number) => ({
    id: event?.id ?? `${event?.serverTimestamp ?? index}-${event?.eventType ?? 'event'}`,
    eventType: String(event?.eventType ?? event?.event_type ?? 'event'),
    message: event?.message ?? null,
    severity: event?.severity ?? 'low',
    deviceId: event?.deviceId ?? event?.device_id ?? null,
    serverTimestamp: event?.serverTimestamp ?? event?.server_timestamp ?? new Date().toISOString(),
  }));
};
const formatLabel = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('vi-VN', { weekday: 'short' }).format(date);
};
const groupEventsByDay = (events: DashboardEvent[], days: number) => {
  const bucket = new Map<string, DeviceActivityPoint>();
  const now = new Date();
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - index);
    const key = date.toISOString().slice(0, 10);
    bucket.set(key, {
      label: formatLabel(key),
      running: 0,
      idle: 0,
      offline: 0,
    });
  }
  for (const event of events) {
    const dateKey = String(event.serverTimestamp ?? '').slice(0, 10);
    const current = bucket.get(dateKey);
    if (!current) {
      continue;
    }
    const message = `${event.eventType} ${event.message ?? ''}`.toLowerCase();
    if (message.includes('offline') || message.includes('disconnect')) {
      current.offline += 1;
    } else if (message.includes('idle') || message.includes('stop')) {
      current.idle += 1;
    } else {
      current.running += 1;
    }
  }
  return Array.from(bucket.values());
};
const groupRuntimeByDay = (events: DashboardEvent[], days: number) => {
  const bucket = new Map<string, number>();
  const now = new Date();
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - index);
    const key = date.toISOString().slice(0, 10);
    bucket.set(key, 0);
  }
  for (const event of events) {
    const dateKey = String(event.serverTimestamp ?? '').slice(0, 10);
    if (!bucket.has(dateKey)) {
      continue;
    }
    bucket.set(dateKey, (bucket.get(dateKey) ?? 0) + 1.5);
  }
  return Array.from(bucket.entries()).map(([dateKey, runtime]) => ({
    label: new Intl.DateTimeFormat('vi-VN', { month: '2-digit', day: '2-digit' }).format(
      new Date(dateKey),
    ),
    runtime: Number(runtime.toFixed(1)),
  }));
};
export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => dashboardServices.getStats().then(normalizeStats),
    refetchInterval: 60000,
  });
};
export const useDashboardActivity = (limit = 20) => {
  return useQuery({
    queryKey: ['dashboard', 'activity', limit],
    queryFn: () =>
      dashboardServices.getActivity({ limit }).then((payload) => normalizeEvents(payload)),
    refetchInterval: 30000,
  });
};
export const useDeviceActivity = (days = 7) => {
  return useQuery({
    queryKey: ['dashboard', 'device-activity', days],
    queryFn: async (): Promise<DeviceActivityPoint[]> => {
      try {
        const response = await apiClient.get('/dashboard/device-activity', {
          params: { days },
        });
        const payload = unwrap<any>(response.data);
        const rows = Array.isArray(payload?.items)
          ? payload.items
          : Array.isArray(payload)
            ? payload
            : [];
        if (rows.length > 0) {
          return rows.map((row: any) => ({
            label: String(row?.label ?? row?.date ?? '-'),
            running: Number(row?.running ?? 0),
            idle: Number(row?.idle ?? 0),
            offline: Number(row?.offline ?? 0),
          }));
        }
      } catch {
        // Fallback below when endpoint is unavailable.
      }
      const activityPayload = await dashboardServices.getActivity({ limit: 300 });
      const events = normalizeEvents(activityPayload);
      return groupEventsByDay(events, days);
    },
  });
};
export const useDeviceStatusDistribution = () => {
  const statsQuery = useDashboardStats();
  return useQuery({
    queryKey: ['dashboard', 'device-status'],
    queryFn: async (): Promise<PieStatusPoint[]> => {
      try {
        const response = await apiClient.get('/dashboard/device-status');
        const payload = unwrap<any>(response.data);
        const rows = Array.isArray(payload?.items)
          ? payload.items
          : Array.isArray(payload)
            ? payload
            : [];
        if (rows.length > 0) {
          return rows.map((row: any, index: number) => ({
            name: String(row?.name ?? row?.status ?? `Status ${index + 1}`),
            value: Number(row?.value ?? row?.count ?? 0),
            color: row?.color ?? ['#22c55e', '#64748b', '#ef4444', '#f59e0b'][index % 4],
          }));
        }
      } catch {
        // Fallback below when endpoint is unavailable.
      }
      const stats = statsQuery.data ?? normalizeStats({});
      const active = Number(stats.activeDevices ?? 0);
      const offline = Number(stats.offlineDevices ?? 0);
      const stopped = Math.max(0, Number(stats.totalDevices ?? 0) - active - offline);
      return [
        { name: 'Đang chạy', value: active, color: '#22c55e' },
        { name: 'Đã dừng', value: stopped, color: '#64748b' },
        { name: 'Ngoại tuyến', value: offline, color: '#ef4444' },
      ];
    },
  });
};
export const useFleetRuntime = (days = 30) => {
  return useQuery({
    queryKey: ['dashboard', 'fleet-runtime', days],
    queryFn: async (): Promise<FleetRuntimePoint[]> => {
      try {
        const response = await apiClient.get('/dashboard/fleet-runtime', {
          params: { days },
        });
        const payload = unwrap<any>(response.data);
        const rows = Array.isArray(payload?.items)
          ? payload.items
          : Array.isArray(payload)
            ? payload
            : [];
        if (rows.length > 0) {
          return rows.map((row: any) => ({
            label: String(row?.label ?? row?.date ?? '-'),
            runtime: Number(row?.runtime ?? row?.value ?? 0),
          }));
        }
      } catch {
        // Fallback below when endpoint is unavailable.
      }
      const activityPayload = await dashboardServices.getActivity({ limit: 500 });
      const events = normalizeEvents(activityPayload);
      return groupRuntimeByDay(events, days);
    },
  });
};
