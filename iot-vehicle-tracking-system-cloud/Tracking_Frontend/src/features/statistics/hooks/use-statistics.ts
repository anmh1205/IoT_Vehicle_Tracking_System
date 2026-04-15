import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { deviceServices } from '@/lib/api/devices';
import { apiClient, unwrap } from '@/lib/api/client';
import { statisticsServices } from '@/lib/api/statistics';
import { formatLocalDateKey, parseDateKeyAsLocal, toLocalDateInputValue } from '@/lib/utils';
import { deriveDeviceStatus } from '@/hooks/use-device-status-realtime';

export interface StatisticsParams {
  from: string;
  to: string;
  interval: 'day' | 'week' | 'month';
}

export interface StatisticsSummary {
  totalRuntimeHours: number;
  averageUptimePercent: number;
  totalSessions: number;
  totalAlerts: number;
}

interface StatisticsDeviceSnapshot {
  deviceId: string;
  deviceName: string;
  currentStatus: 'running' | 'stopped' | 'disconnected' | 'online';
  lastSeenAt: string | null;
  requestInterval: number;
  totalRuntimeSeconds: number;
}

const defaultFrom = toLocalDateInputValue(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
const defaultTo = toLocalDateInputValue(new Date());

export const useStatisticsParams = (): StatisticsParams =>
  useMemo(
    () => ({
      from: defaultFrom,
      to: defaultTo,
      interval: 'day',
    }),
    [],
  );

const normalizeSummary = (payload: any): StatisticsSummary => ({
  totalRuntimeHours: Number(payload?.totalRuntimeHours ?? payload?.totalRuntime ?? 0),
  averageUptimePercent: Number(payload?.averageUptimePercent ?? payload?.avgUptime ?? 0),
  totalSessions: Number(payload?.totalSessions ?? payload?.sessions ?? 0),
  totalAlerts: Number(payload?.totalAlerts ?? payload?.alerts ?? 0),
});

const toDeviceSnapshot = (raw: any): StatisticsDeviceSnapshot => ({
  deviceId: String(raw?.deviceId ?? raw?.device_id ?? ''),
  deviceName: String(raw?.deviceName ?? raw?.device_name ?? raw?.deviceId ?? 'Thiết bị'),
  currentStatus: (raw?.currentStatus ??
    raw?.current_status ??
    'disconnected') as StatisticsDeviceSnapshot['currentStatus'],
  lastSeenAt: raw?.lastSeenAt ?? raw?.last_seen_at ?? null,
  requestInterval: Number(raw?.requestInterval ?? raw?.request_interval ?? 60),
  totalRuntimeSeconds: Number(raw?.totalRuntimeSeconds ?? raw?.total_runtime_seconds ?? 0),
});

const loadDeviceSnapshot = async (): Promise<StatisticsDeviceSnapshot[]> => {
  const payload = await deviceServices.getList({
    page: 1,
    limit: 500,
    sortBy: 'lastSeenAt',
    sortOrder: 'desc',
  });

  return (payload.items ?? []).map(toDeviceSnapshot);
};

const getSnapshotStatus = (device: StatisticsDeviceSnapshot) =>
  deriveDeviceStatus({
    lastSeenAt: device.lastSeenAt,
    requestInterval: device.requestInterval,
    serverStatus: device.currentStatus,
  }).status;

const buildLabels = (params: StatisticsParams) => {
  const from = parseDateKeyAsLocal(params.from);
  const to = parseDateKeyAsLocal(params.to);
  const labels: string[] = [];
  const cursor = new Date(from);

  while (cursor <= to) {
    labels.push(formatLocalDateKey(cursor));
    if (params.interval === 'month') {
      cursor.setMonth(cursor.getMonth() + 1);
    } else if (params.interval === 'week') {
      cursor.setDate(cursor.getDate() + 7);
    } else {
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return labels;
};

const isMeaningfulSeries = (values: number[]) => values.some((value) => Number(value) > 0);

const buildFleetUsageFromDevices = (devices: StatisticsDeviceSnapshot[], params: StatisticsParams) => {
  const labels = buildLabels(params);
  const lastIndex = Math.max(labels.length - 1, 0);
  const activeCount = devices.filter((device) => {
    const status = getSnapshotStatus(device);
    return status === 'running' || status === 'online';
  }).length;
  const inactiveCount = Math.max(devices.length - activeCount, 0);

  return {
    labels,
    activeVehicles: labels.map((_, index) => (index === lastIndex ? activeCount : 0)),
    inactiveVehicles: labels.map((_, index) => (index === lastIndex ? inactiveCount : 0)),
  };
};

const buildDeviceUptimeFromDevices = (devices: StatisticsDeviceSnapshot[], params: StatisticsParams) => {
  const totalHours = Math.max(
    (parseDateKeyAsLocal(params.to).getTime() - parseDateKeyAsLocal(params.from).getTime()) /
      (1000 * 60 * 60),
    24,
  );

  return {
    devices: devices.map((device) => {
      const status = getSnapshotStatus(device);
      const uptimePercent = status === 'running' || status === 'online' ? 100 : status === 'stopped' ? 60 : 0;
      const downHours = Math.max(totalHours * (1 - uptimePercent / 100), 0);

      return {
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        uptimePercent,
        totalHours: Number(totalHours.toFixed(1)),
        downHours: Number(downHours.toFixed(1)),
      };
    }),
  };
};

const buildSummaryFromDevices = (
  devices: StatisticsDeviceSnapshot[],
  params: StatisticsParams,
): StatisticsSummary => {
  const uptime = buildDeviceUptimeFromDevices(devices, params);
  const uptimeDevices = uptime.devices;
  const activeLike = devices.filter((device) => getSnapshotStatus(device) !== 'disconnected');
  const runtimeFromTotals = devices.reduce((sum, device) => sum + device.totalRuntimeSeconds, 0) / 3600;
  const runtimeFallback = activeLike.length * 0.2;

  return {
    totalRuntimeHours: Number(
      (runtimeFromTotals > 0 ? runtimeFromTotals : runtimeFallback).toFixed(1),
    ),
    averageUptimePercent:
      uptimeDevices.length > 0
        ? Number(
            (
              uptimeDevices.reduce((sum, item) => sum + Number(item.uptimePercent ?? 0), 0) /
              uptimeDevices.length
            ).toFixed(1),
          )
        : 0,
    totalSessions: activeLike.length,
    totalAlerts: devices.filter((device) => getSnapshotStatus(device) === 'disconnected').length,
  };
};

export const useStatisticsSummary = (params: StatisticsParams) => {
  const requestParams: Record<string, unknown> = { ...params };

  return useQuery<StatisticsSummary>({
    queryKey: ['statistics', 'summary', params],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/statistics/summary', { params: requestParams });
        const normalized = normalizeSummary(unwrap<any>(response.data));
        if (
          isMeaningfulSeries([
            normalized.totalRuntimeHours,
            normalized.averageUptimePercent,
            normalized.totalSessions,
            normalized.totalAlerts,
          ])
        ) {
          return normalized;
        }
      } catch {
        // Fall back below.
      }

      try {
        const [fleet, uptime, alerts, trips] = await Promise.all([
          statisticsServices.getFleetUsage(requestParams),
          statisticsServices.getDeviceUptime(requestParams),
          statisticsServices.getAlertFrequency(requestParams),
          statisticsServices.getTripSummary(requestParams),
        ]);

        const runtimeHours = Array.isArray(fleet?.activeVehicles)
          ? fleet.activeVehicles.reduce((sum: number, value: number) => sum + Number(value ?? 0), 0)
          : 0;
        const uptimeDevices = Array.isArray(uptime?.devices) ? uptime.devices : [];
        const averageUptimePercent =
          uptimeDevices.length > 0
            ? uptimeDevices.reduce(
                (sum: number, row: any) => sum + Number(row?.uptimePercent ?? 0),
                0,
              ) / uptimeDevices.length
            : 0;
        const totalAlerts = Object.values(alerts?.series ?? {}).reduce<number>(
          (sum, series: any) =>
            sum +
            (Array.isArray(series)
              ? series.reduce((acc: number, item: any) => acc + Number(item ?? 0), 0)
              : 0),
          0,
        );
        const totalSessions = Array.isArray(trips?.totalTrips)
          ? trips.totalTrips.reduce((sum: number, value: number) => sum + Number(value ?? 0), 0)
          : 0;
        const fallback = {
          totalRuntimeHours: Number(runtimeHours.toFixed(1)),
          averageUptimePercent: Number(averageUptimePercent.toFixed(1)),
          totalSessions,
          totalAlerts,
        };

        if (
          isMeaningfulSeries([
            fallback.totalRuntimeHours,
            fallback.averageUptimePercent,
            fallback.totalSessions,
            fallback.totalAlerts,
          ])
        ) {
          return fallback;
        }
      } catch {
        // Fall back below.
      }

      const devices = await loadDeviceSnapshot();
      return buildSummaryFromDevices(devices, params);
    },
  });
};

export const useFleetUtilization = (params: StatisticsParams) => {
  const requestParams: Record<string, unknown> = { ...params };

  return useQuery({
    queryKey: ['statistics', 'fleet-utilization', params],
    queryFn: async () => {
      try {
        const payload = await statisticsServices.getFleetUsage(requestParams);
        if (isMeaningfulSeries(payload?.activeVehicles ?? [])) {
          return payload;
        }
      } catch {
        // Fall back below.
      }

      const devices = await loadDeviceSnapshot();
      return buildFleetUsageFromDevices(devices, params);
    },
  });
};

export const useDeviceUptime = (params: StatisticsParams) => {
  const requestParams: Record<string, unknown> = { ...params };

  return useQuery({
    queryKey: ['statistics', 'device-uptime', params],
    queryFn: async () => {
      try {
        const payload = await statisticsServices.getDeviceUptime(requestParams);
        const rows = Array.isArray(payload?.devices) ? payload.devices : [];
        if (rows.some((row: any) => Number(row?.uptimePercent ?? row?.uptime_percent ?? 0) > 0)) {
          return payload;
        }
      } catch {
        // Fall back below.
      }

      const devices = await loadDeviceSnapshot();
      return buildDeviceUptimeFromDevices(devices, params);
    },
  });
};
