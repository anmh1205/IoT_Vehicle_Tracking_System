/**
 * useTelemetry Hook - Fetch telemetry data
 */
import { useQuery } from '@tanstack/react-query';
import { telemetryServices } from '@/lib/api/telemetry';
import { QUERY_KEYS } from '@/lib/constants/query-keys';
import { STALE_TIMES } from '@/lib/constants/query-cache';
import type { QueryTelemetryDto } from '@/types';

export function useTelemetryLocation(params: QueryTelemetryDto, enabled: boolean = true) {
  return useQuery({
    queryKey: [...QUERY_KEYS.TELEMETRY_LOCATION, params],
    queryFn: () => telemetryServices.getLocation(params),
    enabled,
    staleTime: STALE_TIMES.REALTIME,
    refetchInterval: STALE_TIMES.REALTIME,
  });
}

export function useTelemetryHistory(vehicleId: number | undefined, params?: QueryTelemetryDto, enabled: boolean = true) {
  return useQuery({
    queryKey: [...QUERY_KEYS.TELEMETRY_HISTORY(vehicleId!), params],
    queryFn: () => telemetryServices.getHistory({ ...params, vehicleId }),
    enabled: enabled && !!vehicleId,
    staleTime: STALE_TIMES.VEHICLE_LIST,
  });
}

