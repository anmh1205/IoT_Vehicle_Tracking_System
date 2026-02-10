'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api/dashboard';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.getStats().then((r) => r.data.data),
    refetchInterval: 30000,
  });
}

export function useActivityFeed(page = 1) {
  return useQuery({
    queryKey: ['activity', page],
    queryFn: () => dashboardApi.getActivity({ page, limit: 20 }).then((r) => r.data.data),
  });
}
