import { useQuery } from '@tanstack/react-query';
import { dashboardServices } from '@/lib/api/dashboard';
import { deviceServices } from '@/lib/api/devices';
import { apiClient, unwrap } from '@/lib/api/client';
import { formatLocalDateKey, parseDateKeyAsLocal } from '@/lib/utils';
import { deriveDeviceStatus } from '@/hooks/use-device-status-realtime';

export interface DashboardEvent {
  id: string | number;
  eventType: string;
  eventCode?: string | null;
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

interface DashboardDeviceSnapshot {
  deviceId: string;
  deviceName: string;
  currentStatus: 'running' | 'stopped' | 'disconnected' | 'online';
  lastSeenAt: string | null;
  requestInterval: number;
  totalRuntimeSeconds: number;
}

const DEVICE_LIST_LIMIT = 100;
const DEVICE_LIST_MAX_PAGES = 50;

const normalizeStats = (raw: any): DashboardOverviewStats => ({
  totalDevices: Number(raw?.totalDevices ?? 0),
  activeDevices: Number(raw?.activeDevices ?? 0),
  offlineDevices: Number(raw?.offlineDevices ?? 0),
  alertsCount: Number(raw?.alertsCount ?? 0),
  totalRuntimeToday: Number(raw?.totalRuntimeToday ?? 0),
  totalRuntimeWeek: Number(raw?.totalRuntimeWeek ?? 0),
  sessionsToday: Number(raw?.sessionsToday ?? 0),
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
    eventType: String(event?.eventType ?? 'event'),
    eventCode: event?.eventCode ?? null,
    message: event?.message ?? null,
    severity: event?.severity ?? 'low',
    deviceId: event?.deviceId ?? null,
    serverTimestamp: event?.serverTimestamp ?? new Date().toISOString(),
  }));
};

const formatLabel = (value: string) => {
  const date = parseDateKeyAsLocal(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('vi-VN', { weekday: 'short' }).format(date);
};

const formatRangeLabel = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', { month: '2-digit', day: '2-digit' }).format(
    parseDateKeyAsLocal(value),
  );

const STATUS_NAME_LABELS: Record<string, string> = {
  running: 'Đang chạy',
  online: 'Đỗ xe / còn online',
  stopped: 'Đã dừng',
  offline: 'Ngoại tuyến',
  error: 'Lỗi',
  unknown: 'Chưa rõ',
};

const buildDateBucket = <TValue>(
  days: number,
  createValue: (dateKey: string) => TValue,
): Map<string, TValue> => {
  const bucket = new Map<string, TValue>();
  const now = new Date();

  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - index);
    const key = formatLocalDateKey(date);
    bucket.set(key, createValue(key));
  }

  return bucket;
};

const groupEventsByDay = (events: DashboardEvent[], days: number) => {
  const bucket = buildDateBucket(days, (dateKey) => ({
    label: formatLabel(dateKey),
    running: 0,
    idle: 0,
    offline: 0,
  }));

  for (const event of events) {
    const eventDate = new Date(String(event.serverTimestamp ?? ''));
    if (Number.isNaN(eventDate.getTime())) {
      continue;
    }

    const dateKey = formatLocalDateKey(eventDate);
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
  const bucket = buildDateBucket(days, () => 0);

  for (const event of events) {
    const eventDate = new Date(String(event.serverTimestamp ?? ''));
    if (Number.isNaN(eventDate.getTime())) {
      continue;
    }

    const dateKey = formatLocalDateKey(eventDate);
    if (!bucket.has(dateKey)) {
      continue;
    }

    bucket.set(dateKey, (bucket.get(dateKey) ?? 0) + 1.5);
  }

  return Array.from(bucket.entries()).map(([dateKey, runtime]) => ({
    label: formatRangeLabel(dateKey),
    runtime: Number(runtime.toFixed(1)),
  }));
};

const toDeviceSnapshot = (raw: any): DashboardDeviceSnapshot => ({
  deviceId: String(raw?.deviceId ?? ''),
  deviceName: String(raw?.deviceName ?? raw?.deviceId ?? 'Thiết bị'),
  currentStatus: (raw?.currentStatus ??
    'disconnected') as DashboardDeviceSnapshot['currentStatus'],
  lastSeenAt: raw?.lastSeenAt ?? null,
  requestInterval: Number(raw?.requestInterval ?? 60),
  totalRuntimeSeconds: Number(raw?.totalRuntimeSeconds ?? 0),
});

const loadDeviceSnapshot = async (): Promise<DashboardDeviceSnapshot[]> => {
  const snapshots: DashboardDeviceSnapshot[] = [];

  for (let page = 1; page <= DEVICE_LIST_MAX_PAGES; page += 1) {
    const payload = await deviceServices.getList({
      page,
      limit: DEVICE_LIST_LIMIT,
      sortBy: 'lastSeenAt',
      sortOrder: 'desc',
    });

    const rows = payload.items ?? [];
    snapshots.push(...rows.map(toDeviceSnapshot));

    const totalPages = Number(payload.pagination?.totalPages ?? 1);
    if (rows.length === 0 || page >= totalPages) {
      break;
    }
  }

  return snapshots;
};

const getSnapshotStatus = (device: DashboardDeviceSnapshot) =>
  deriveDeviceStatus({
    lastSeenAt: device.lastSeenAt,
    requestInterval: device.requestInterval,
    serverStatus: device.currentStatus,
  }).status;

const hasNonZeroValue = (values: number[]) => values.some((value) => Number(value) > 0);

const hasMeaningfulStats = (stats: DashboardOverviewStats) =>
  hasNonZeroValue([
    stats.totalDevices,
    stats.activeDevices,
    stats.offlineDevices,
    stats.alertsCount,
    stats.totalRuntimeToday,
    stats.totalRuntimeWeek,
    stats.sessionsToday,
  ]);

const hasMeaningfulDistribution = (rows: PieStatusPoint[]) =>
  rows.length > 0 && rows.some((row) => row.value > 0);

const hasMeaningfulActivity = (rows: DeviceActivityPoint[]) =>
  rows.length > 0 && rows.some((row) => row.running > 0 || row.idle > 0 || row.offline > 0);

const hasMeaningfulRuntime = (rows: FleetRuntimePoint[]) =>
  rows.length > 0 && rows.some((row) => row.runtime > 0);

const isSameOrAfter = (value: string | null, days: number) => {
  if (!value) {
    return false;
  }
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return false;
  }
  return timestamp >= Date.now() - days * 24 * 60 * 60 * 1000;
};

const isToday = (value: string | null) => {
  if (!value) {
    return false;
  }
  return formatLocalDateKey(new Date(value)) === formatLocalDateKey(new Date());
};

const estimateRuntimeHours = (device: DashboardDeviceSnapshot) => {
  if (!device.lastSeenAt) {
    return 0;
  }

  const status = getSnapshotStatus(device);
  const freshnessHours = Math.max(
    (device.requestInterval * (status === 'running' ? 8 : 3)) / 3600,
    status === 'running' ? 0.2 : 0.05,
  );

  if (status === 'running') {
    return Number(Math.min(freshnessHours, 2).toFixed(1));
  }
  if (status === 'stopped' || status === 'online') {
    return Number(Math.min(freshnessHours, 0.5).toFixed(1));
  }
  return 0;
};

const buildOverviewStatsFromDevices = (
  devices: DashboardDeviceSnapshot[],
): DashboardOverviewStats => {
  const totalDevices = devices.length;
  const activeDevices = devices.filter((device) => {
    const status = getSnapshotStatus(device);
    return status === 'running' || status === 'online';
  }).length;
  const offlineDevices = devices.filter((device) => getSnapshotStatus(device) === 'disconnected').length;
  const alertsCount = offlineDevices;
  const sessionsToday = 0;
  const totalRuntimeToday = Number(
    devices
      .filter((device) => isToday(device.lastSeenAt))
      .reduce((sum, device) => sum + estimateRuntimeHours(device), 0)
      .toFixed(1),
  );
  const totalRuntimeWeek = Number(
    devices
      .filter((device) => isSameOrAfter(device.lastSeenAt, 7))
      .reduce((sum, device) => sum + estimateRuntimeHours(device), 0)
      .toFixed(1),
  );

  return {
    totalDevices,
    activeDevices,
    offlineDevices,
    alertsCount,
    totalRuntimeToday,
    totalRuntimeWeek,
    sessionsToday,
  };
};

const buildSyntheticEvents = (devices: DashboardDeviceSnapshot[]): DashboardEvent[] =>
  devices
    .filter((device) => device.lastSeenAt)
    .map((device) => {
      const status = getSnapshotStatus(device);
      if (status === 'disconnected') {
        return {
          id: `${device.deviceId}-offline`,
          eventType: 'Thiết bị ngoại tuyến',
          message: `${device.deviceName} chưa gửi dữ liệu gần đây`,
          severity: 'high',
          deviceId: device.deviceId,
          serverTimestamp: device.lastSeenAt ?? new Date().toISOString(),
        };
      }
      if (status === 'stopped') {
        return {
          id: `${device.deviceId}-stopped`,
          eventType: 'Thiết bị tạm dừng',
          message: `${device.deviceName} vẫn được nhìn thấy nhưng đã chậm nhịp gửi`,
          severity: 'medium',
          deviceId: device.deviceId,
          serverTimestamp: device.lastSeenAt ?? new Date().toISOString(),
        };
      }
      if (status === 'online') {
        return {
          id: `${device.deviceId}-online`,
          eventType: 'Thiết bị còn online',
          message: `${device.deviceName} đã kết thúc phiên lái nhưng vẫn còn heartbeat parking`,
          severity: 'low',
          deviceId: device.deviceId,
          serverTimestamp: device.lastSeenAt ?? new Date().toISOString(),
        };
      }
      return {
        id: `${device.deviceId}-running`,
        eventType: 'Thiết bị đang chạy',
        message: `${device.deviceName} đang gửi dữ liệu driving bình thường`,
        severity: 'low',
        deviceId: device.deviceId,
        serverTimestamp: device.lastSeenAt ?? new Date().toISOString(),
      };
    })
    .sort(
      (left, right) =>
        new Date(right.serverTimestamp ?? 0).getTime() - new Date(left.serverTimestamp ?? 0).getTime(),
    );

const buildActivityFromDevices = (
  devices: DashboardDeviceSnapshot[],
  days: number,
): DeviceActivityPoint[] => {
  const bucket = buildDateBucket(days, (dateKey) => ({
    label: formatLabel(dateKey),
    running: 0,
    idle: 0,
    offline: 0,
  }));

  for (const device of devices) {
    if (!device.lastSeenAt) {
      continue;
    }

    const timestamp = new Date(device.lastSeenAt);
    if (Number.isNaN(timestamp.getTime())) {
      continue;
    }

    const current = bucket.get(formatLocalDateKey(timestamp));
    if (!current) {
      continue;
    }

    const status = getSnapshotStatus(device);
    if (status === 'disconnected') {
      current.offline += 1;
    } else if (status === 'stopped' || status === 'online') {
      current.idle += 1;
    } else {
      current.running += 1;
    }
  }

  return Array.from(bucket.values());
};

const buildRuntimeFromDevices = (
  devices: DashboardDeviceSnapshot[],
  days: number,
): FleetRuntimePoint[] => {
  const bucket = buildDateBucket(days, () => 0);

  for (const device of devices) {
    if (!device.lastSeenAt) {
      continue;
    }

    const timestamp = new Date(device.lastSeenAt);
    if (Number.isNaN(timestamp.getTime())) {
      continue;
    }

    const dateKey = formatLocalDateKey(timestamp);
    if (!bucket.has(dateKey)) {
      continue;
    }

    bucket.set(dateKey, (bucket.get(dateKey) ?? 0) + estimateRuntimeHours(device));
  }

  return Array.from(bucket.entries()).map(([dateKey, runtime]) => ({
    label: formatRangeLabel(dateKey),
    runtime: Number(runtime.toFixed(1)),
  }));
};

const buildStatusDistributionFromDevices = (
  devices: DashboardDeviceSnapshot[],
): PieStatusPoint[] => {
  const counts = {
    running: 0,
    online: 0,
    stopped: 0,
    disconnected: 0,
  };

  for (const device of devices) {
    const status = getSnapshotStatus(device);
    if (status === 'running') {
      counts.running += 1;
    } else if (status === 'online') {
      counts.online += 1;
    } else if (status === 'stopped') {
      counts.stopped += 1;
    } else {
      counts.disconnected += 1;
    }
  }

  return [
    { name: 'Đang chạy', value: counts.running, color: '#22c55e' },
    { name: 'Đỗ xe / còn online', value: counts.online, color: '#0ea5e9' },
    { name: 'Đã dừng', value: counts.stopped, color: '#64748b' },
    { name: 'Ngoại tuyến', value: counts.disconnected, color: '#ef4444' },
  ];
};

export const useDashboardStats = () =>
  useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      try {
        const stats = normalizeStats(await dashboardServices.getStats());
        if (hasMeaningfulStats(stats)) {
          return stats;
        }
      } catch {
        // Fall back to device snapshot below.
      }

      const devices = await loadDeviceSnapshot();
      return buildOverviewStatsFromDevices(devices);
    },
  });

export const useDashboardActivity = (limit = 20) =>
  useQuery({
    queryKey: ['dashboard', 'activity', limit],
    queryFn: async () => {
      try {
        const events = normalizeEvents(await dashboardServices.getActivity({ limit }));
        if (events.length > 0) {
          return events;
        }
      } catch {
        // Fall back to device snapshot below.
      }

      const devices = await loadDeviceSnapshot();
      return buildSyntheticEvents(devices).slice(0, limit);
    },
  });

export const useDeviceActivity = (days = 7) =>
  useQuery({
    queryKey: ['dashboard', 'device-activity', days],
    queryFn: async (): Promise<DeviceActivityPoint[]> => {
      try {
        const response = await apiClient.get('/dashboard/device-activity', { params: { days } });
        const payload = unwrap<any>(response.data);
        const rows = Array.isArray(payload?.items)
          ? payload.items
          : Array.isArray(payload)
            ? payload
            : [];

        if (rows.length > 0) {
          const normalized = rows.map((row: any) => ({
            label: String(row?.label ?? row?.date ?? '-'),
            running: Number(row?.running ?? 0),
            idle: Number(row?.idle ?? 0),
            offline: Number(row?.offline ?? 0),
          }));

          if (hasMeaningfulActivity(normalized)) {
            return normalized;
          }
        }
      } catch {
        // Fall back below when endpoint is unavailable.
      }

      const events = normalizeEvents(await dashboardServices.getActivity({ limit: 300 }).catch(() => []));
      if (events.length > 0) {
        const grouped = groupEventsByDay(events, days);
        if (hasMeaningfulActivity(grouped)) {
          return grouped;
        }
      }

      const devices = await loadDeviceSnapshot();
      return buildActivityFromDevices(devices, days);
    },
  });

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
          const normalized = rows.map((row: any, index: number) => ({
            name:
              STATUS_NAME_LABELS[String(row?.name ?? row?.status ?? '').toLowerCase()] ??
              String(row?.name ?? row?.status ?? `Trạng thái ${index + 1}`),
            value: Number(row?.value ?? row?.count ?? 0),
            color: row?.color ?? ['#22c55e', '#64748b', '#ef4444', '#f59e0b'][index % 4],
          }));

          if (hasMeaningfulDistribution(normalized)) {
            return normalized;
          }
        }
      } catch {
        // Fall back below when endpoint is unavailable.
      }

      const devices = await loadDeviceSnapshot();
      const derived = buildStatusDistributionFromDevices(devices);
      if (hasMeaningfulDistribution(derived)) {
        return derived;
      }

      const stats = statsQuery.data ?? normalizeStats({});
      const active = Number(stats.activeDevices ?? 0);
      const offline = Number(stats.offlineDevices ?? 0);
      const stopped = Math.max(0, Number(stats.totalDevices ?? 0) - active - offline);

      return [
        { name: 'Trực tuyến', value: active, color: '#22c55e' },
        { name: 'Đã dừng', value: stopped, color: '#64748b' },
        { name: 'Ngoại tuyến', value: offline, color: '#ef4444' },
      ];
    },
  });
};

export const useFleetRuntime = (days = 30) =>
  useQuery({
    queryKey: ['dashboard', 'fleet-runtime', days],
    queryFn: async (): Promise<FleetRuntimePoint[]> => {
      try {
        const response = await apiClient.get('/dashboard/fleet-runtime', { params: { days } });
        const payload = unwrap<any>(response.data);
        const rows = Array.isArray(payload?.items)
          ? payload.items
          : Array.isArray(payload)
            ? payload
            : [];

        if (rows.length > 0) {
          const normalized = rows.map((row: any) => ({
            label: String(row?.label ?? row?.date ?? '-'),
            runtime: Number(row?.runtime ?? row?.value ?? 0),
          }));

          if (hasMeaningfulRuntime(normalized)) {
            return normalized;
          }
        }
      } catch {
        // Fall back below when endpoint is unavailable.
      }

      const events = normalizeEvents(await dashboardServices.getActivity({ limit: 500 }).catch(() => []));
      if (events.length > 0) {
        const grouped = groupRuntimeByDay(events, days);
        if (hasMeaningfulRuntime(grouped)) {
          return grouped;
        }
      }

      const devices = await loadDeviceSnapshot();
      return buildRuntimeFromDevices(devices, days);
    },
  });
