import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient, unwrap } from '@/lib/api/client';
import {
  statisticsServices,
  type StatisticsSummary,
} from '@/lib/api/statistics';
import { toLocalDateInputValue } from '@/lib/utils';

export type { StatisticsSummary } from '@/lib/api/statistics';

export interface StatisticsParams {
  from: string;
  to: string;
  interval: 'day' | 'week' | 'month';
}

const DEFAULT_RANGE_MS = 30 * 24 * 60 * 60 * 1000;

export const useStatisticsParams = (): StatisticsParams =>
  useMemo(() => {
    const now = new Date();
    return {
      from: toLocalDateInputValue(new Date(now.getTime() - DEFAULT_RANGE_MS)),
      to: toLocalDateInputValue(now),
      interval: 'day',
    };
  }, []);

export const useStatisticsSummary = (params: StatisticsParams) =>
  useQuery<StatisticsSummary>({
    queryKey: ['statistics', 'summary', params],
    queryFn: async () => {
      const response = await apiClient.get('/statistics/summary', { params });
      return unwrap<StatisticsSummary>(response.data);
    },
  });

export const useFleetUtilization = (params: StatisticsParams) =>
  useQuery({
    queryKey: ['statistics', 'fleet-utilization', params],
    queryFn: () => statisticsServices.getFleetUsage({ ...params }),
  });

export const useDeviceUptime = (params: StatisticsParams) =>
  useQuery({
    queryKey: ['statistics', 'device-uptime', params],
    queryFn: () => statisticsServices.getDeviceUptime({ ...params }),
  });
