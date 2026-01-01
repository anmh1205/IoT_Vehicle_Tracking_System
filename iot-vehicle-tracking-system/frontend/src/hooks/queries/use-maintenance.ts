/**
 * useMaintenance Hook - Fetch maintenance records
 */
import { useQuery } from '@tanstack/react-query';
import { maintenanceServices } from '@/lib/api/maintenance';
import { QUERY_KEYS } from '@/lib/constants/query-keys';
import { STALE_TIMES } from '@/lib/constants/query-cache';
import type { QueryMaintenanceDto } from '@/types';

export function useMaintenance(params?: QueryMaintenanceDto, enabled: boolean = true) {
  return useQuery({
    queryKey: [...QUERY_KEYS.MAINTENANCE, params],
    queryFn: () => maintenanceServices.list(params),
    enabled,
    staleTime: STALE_TIMES.VEHICLE_LIST,
  });
}

export function useMaintenanceRecord(id: number | string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.MAINTENANCE_RECORD(id!),
    queryFn: () => maintenanceServices.getById(id!),
    enabled: !!id,
    staleTime: STALE_TIMES.VEHICLE_LIST,
  });
}

