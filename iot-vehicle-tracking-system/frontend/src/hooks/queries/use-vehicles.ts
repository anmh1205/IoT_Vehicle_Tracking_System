/**
 * useVehicles Hook - Fetch vehicles list
 */
import { useQuery } from '@tanstack/react-query';
import { vehicleServices } from '@/lib/api/vehicles';
import { QUERY_KEYS } from '@/lib/constants/query-keys';
import { STALE_TIMES } from '@/lib/constants/query-cache';
import type { QueryVehicleDto } from '@/types';

export function useVehicles(params?: QueryVehicleDto, enabled: boolean = true) {
  return useQuery({
    queryKey: [...QUERY_KEYS.VEHICLES, params],
    queryFn: () => vehicleServices.list(params),
    enabled,
    staleTime: STALE_TIMES.VEHICLE_LIST,
  });
}

