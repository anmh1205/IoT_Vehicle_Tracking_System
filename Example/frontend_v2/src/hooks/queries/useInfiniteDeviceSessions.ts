import { useInfiniteQuery } from '@tanstack/react-query';
import { deviceDetailServices } from '@/lib/api/deviceDetail';
import { STALE_TIMES } from '@/lib/constants/queryCache';

export const useInfiniteDeviceSessions = (deviceId: string, limit: number = 20, enabled: boolean = true) => {
  return useInfiniteQuery({
    queryKey: ['device', deviceId, 'sessions', { limit, mode: 'infinite' }],
    queryFn: ({ pageParam }) => deviceDetailServices.getSessionsTabData(deviceId, Number(pageParam ?? 1), limit),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const page = lastPage?.pagination?.page ?? 1;
      const totalPages = lastPage?.pagination?.totalPages ?? 1;
      if (page >= totalPages) return undefined;
      return page + 1;
    },
    enabled: !!deviceId && enabled,
    staleTime: STALE_TIMES.DEVICE_SESSIONS,
    retry: 3,
    refetchOnMount: false
  });
};


