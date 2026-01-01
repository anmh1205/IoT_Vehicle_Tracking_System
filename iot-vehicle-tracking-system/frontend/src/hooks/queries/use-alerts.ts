/**
 * useAlerts Hook - Fetch alerts list
 */
import { useQuery } from '@tanstack/react-query';
import { alertServices } from '@/lib/api/alerts';
import { QUERY_KEYS } from '@/lib/constants/query-keys';
import { STALE_TIMES } from '@/lib/constants/query-cache';
import type { QueryAlertDto } from '@/types';

export function useAlerts(params?: QueryAlertDto, enabled: boolean = true) {
  return useQuery({
    queryKey: [...QUERY_KEYS.ALERTS, params],
    queryFn: () => alertServices.list(params),
    enabled,
    staleTime: STALE_TIMES.ALERTS,
    refetchInterval: STALE_TIMES.ALERTS,
  });
}

export function useAlert(id: number | string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.ALERT(id!),
    queryFn: () => alertServices.getById(id!),
    enabled: !!id,
    staleTime: STALE_TIMES.ALERTS,
  });
}

