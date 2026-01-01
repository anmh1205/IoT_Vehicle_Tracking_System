/**
 * useVehicle Hook - Fetch single vehicle
 */
import { useQuery } from '@tanstack/react-query';
import { vehicleServices } from '@/lib/api/vehicles';
import { QUERY_KEYS } from '@/lib/constants/query-keys';
import { STALE_TIMES } from '@/lib/constants/query-cache';

export function useVehicle(id: number | string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.VEHICLE(id!),
    queryFn: () => vehicleServices.getById(id!),
    enabled: !!id,
    staleTime: STALE_TIMES.VEHICLE_LIST,
  });
}

export function useVehicleStatus(id: number | string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.VEHICLE_STATUS(id!),
    queryFn: () => vehicleServices.getStatus(id!),
    enabled: !!id,
    staleTime: STALE_TIMES.VEHICLE_STATUS,
    refetchInterval: STALE_TIMES.VEHICLE_STATUS,
  });
}

