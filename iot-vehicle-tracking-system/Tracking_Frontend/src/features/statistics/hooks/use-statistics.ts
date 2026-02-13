import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient, unwrap } from '@/lib/api/client';
import { statisticsServices } from '@/lib/api/statistics';
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
const defaultFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const defaultTo = new Date().toISOString().slice(0, 10);
export const useStatisticsParams = (): StatisticsParams => {
  return useMemo(
    () => ({
      from: defaultFrom,
      to: defaultTo,
      interval: 'day',
    }),
    [],
  );
};
const normalizeSummary = (payload: any): StatisticsSummary => ({
  totalRuntimeHours: Number(payload?.totalRuntimeHours ?? payload?.totalRuntime ?? 0),
  averageUptimePercent: Number(payload?.averageUptimePercent ?? payload?.avgUptime ?? 0),
  totalSessions: Number(payload?.totalSessions ?? payload?.sessions ?? 0),
  totalAlerts: Number(payload?.totalAlerts ?? payload?.alerts ?? 0),
});
export const useStatisticsSummary = (params: StatisticsParams) => {
  const requestParams: Record<string, unknown> = { ...params };
  return useQuery<StatisticsSummary>({
    queryKey: ['statistics', 'summary', params],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/statistics/summary', { params: requestParams });
        return normalizeSummary(unwrap<any>(response.data));
      } catch {
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
        return {
          totalRuntimeHours: Number(runtimeHours.toFixed(1)),
          averageUptimePercent: Number(averageUptimePercent.toFixed(1)),
          totalSessions,
          totalAlerts,
        };
      }
    },
  });
};
export const useFleetUtilization = (params: StatisticsParams) => {
  const requestParams: Record<string, unknown> = { ...params };
  return useQuery({
    queryKey: ['statistics', 'fleet-utilization', params],
    queryFn: () => statisticsServices.getFleetUsage(requestParams),
  });
};
export const useDeviceUptime = (params: StatisticsParams) => {
  const requestParams: Record<string, unknown> = { ...params };
  return useQuery({
    queryKey: ['statistics', 'device-uptime', params],
    queryFn: () => statisticsServices.getDeviceUptime(requestParams),
  });
};
