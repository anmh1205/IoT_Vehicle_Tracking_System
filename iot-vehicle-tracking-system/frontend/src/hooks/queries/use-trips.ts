/**
 * useTrips Hook - Fetch trips list
 */
import { useQuery } from '@tanstack/react-query';
import { tripServices } from '@/lib/api/trips';
import { QUERY_KEYS } from '@/lib/constants/query-keys';
import { STALE_TIMES } from '@/lib/constants/query-cache';
import type { QueryTripDto } from '@/types';

export function useTrips(params?: QueryTripDto, enabled: boolean = true) {
  return useQuery({
    queryKey: [...QUERY_KEYS.TRIPS, params],
    queryFn: () => tripServices.list(params),
    enabled,
    staleTime: STALE_TIMES.VEHICLE_LIST,
  });
}

export function useTrip(id: number | string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.TRIP(id!),
    queryFn: () => tripServices.getById(id!),
    enabled: !!id,
    staleTime: STALE_TIMES.VEHICLE_LIST,
  });
}

