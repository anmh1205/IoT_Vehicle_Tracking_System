import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { deviceDetailServices } from '@/lib/api/device-detail';
import type { DeviceSession } from '@/features/devices/types';
interface UseDeviceSessionsOptions {
  pageSize?: number;
}
interface DeviceSessionsResult {
  sessions: DeviceSession[];
  total: number;
  page: number;
  limit: number;
}
const toSessionsResult = (
  payload: any,
  fallbackPage: number,
  fallbackLimit: number,
): DeviceSessionsResult => {
  const sessions = Array.isArray(payload?.sessions)
    ? payload.sessions
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.data?.sessions)
        ? payload.data.sessions
        : Array.isArray(payload?.data?.items)
          ? payload.data.items
          : [];
  return {
    sessions: sessions.map((row: any) => ({
      id: Number(row?.id ?? 0),
      status: row?.status ?? 'running',
      serverSessionStart: row?.serverSessionStart ?? row?.server_session_start ?? null,
      serverSessionEnd: row?.serverSessionEnd ?? row?.server_session_end ?? null,
      uptime: row?.uptime !== undefined ? Number(row.uptime) : null,
      avgVibration: row?.avgVibration !== undefined ? Number(row.avgVibration) : null,
      dataPointsCount: Number(row?.dataPointsCount ?? row?.data_points_count ?? 0),
    })),
    total: Number(payload?.total ?? payload?.pagination?.total ?? sessions.length),
    page: Number(payload?.page ?? payload?.pagination?.page ?? fallbackPage),
    limit: Number(payload?.limit ?? payload?.pagination?.limit ?? fallbackLimit),
  };
};
export const useDeviceSessions = (
  deviceId: number | null,
  options: UseDeviceSessionsOptions = {},
) => {
  const limit = options.pageSize ?? 20;
  const query = useInfiniteQuery({
    queryKey: ['device-sessions', deviceId, limit],
    enabled: !!deviceId,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      deviceDetailServices
        .getSessions(deviceId as number, { page: pageParam, limit })
        .then((data) => toSessionsResult(data, pageParam, limit)),
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce((sum, page) => sum + page.sessions.length, 0);
      if (loadedCount >= lastPage.total) {
        return undefined;
      }
      return lastPage.page + 1;
    },
  });
  const sessions = useMemo(
    () => query.data?.pages.flatMap((page) => page.sessions) ?? [],
    [query.data],
  );
  const total = query.data?.pages[0]?.total ?? 0;
  const page = query.data?.pages[query.data.pages.length - 1]?.page ?? 1;
  return {
    ...query,
    sessions,
    total,
    page,
    limit,
    hasMore: Boolean(query.hasNextPage),
    onLoadMore: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) {
        void query.fetchNextPage();
      }
    },
  };
};
