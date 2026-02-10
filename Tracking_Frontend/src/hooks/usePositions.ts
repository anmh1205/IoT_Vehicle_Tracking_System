'use client';

import { useQuery } from '@tanstack/react-query';
import { devicesApi } from '@/lib/api/devices';

export function usePositions() {
  return useQuery({
    queryKey: ['device-positions'],
    queryFn: () => devicesApi.getPositions().then((r) => r.data.data),
    refetchInterval: 10000,
  });
}
