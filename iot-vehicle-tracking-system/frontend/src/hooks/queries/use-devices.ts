/**
 * useDevices Hook - Fetch devices list
 */
import { useQuery } from '@tanstack/react-query';
import { deviceServices } from '@/lib/api/devices';
import { QUERY_KEYS } from '@/lib/constants/query-keys';
import { STALE_TIMES } from '@/lib/constants/query-cache';
import type { QueryDeviceDto } from '@/types';

export function useDevices(params?: QueryDeviceDto, enabled: boolean = true) {
  return useQuery({
    queryKey: [...QUERY_KEYS.DEVICES, params],
    queryFn: () => deviceServices.list(params),
    enabled,
    staleTime: STALE_TIMES.DEVICE_LIST,
  });
}

export function useDevice(id: number | string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.DEVICE(id!),
    queryFn: () => deviceServices.getById(id!),
    enabled: !!id,
    staleTime: STALE_TIMES.DEVICE_LIST,
  });
}

