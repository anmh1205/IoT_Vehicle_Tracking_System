/**
 * useCommands Hook - Fetch commands list
 */
import { useQuery } from '@tanstack/react-query';
import { commandServices } from '@/lib/api/commands';
import { QUERY_KEYS } from '@/lib/constants/query-keys';
import { STALE_TIMES } from '@/lib/constants/query-cache';
import type { QueryCommandDto } from '@/types';

export function useCommands(params?: QueryCommandDto, enabled: boolean = true) {
  return useQuery({
    queryKey: [...QUERY_KEYS.COMMANDS, params],
    queryFn: () => commandServices.list(params),
    enabled,
    staleTime: STALE_TIMES.VEHICLE_LIST,
  });
}

export function useCommand(id: number | string | undefined) {
  return useQuery({
    queryKey: [...QUERY_KEYS.COMMANDS, id],
    queryFn: () => commandServices.getById(id!),
    enabled: !!id,
    staleTime: STALE_TIMES.VEHICLE_LIST,
  });
}

