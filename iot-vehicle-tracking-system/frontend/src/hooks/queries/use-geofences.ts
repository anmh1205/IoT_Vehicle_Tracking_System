/**
 * useGeofences Hook - Fetch geofences list
 */
import { useQuery } from '@tanstack/react-query';
import { geofenceServices } from '@/lib/api/geofences';
import { QUERY_KEYS } from '@/lib/constants/query-keys';
import { STALE_TIMES } from '@/lib/constants/query-cache';
import type { QueryGeofenceDto } from '@/types';

export function useGeofences(params?: QueryGeofenceDto, enabled: boolean = true) {
  return useQuery({
    queryKey: [...QUERY_KEYS.GEOFENCES, params],
    queryFn: () => geofenceServices.list(params),
    enabled,
    staleTime: STALE_TIMES.GEOFENCES,
  });
}

export function useGeofence(id: number | string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.GEOFENCE(id!),
    queryFn: () => geofenceServices.getById(id!),
    enabled: !!id,
    staleTime: STALE_TIMES.GEOFENCES,
  });
}

