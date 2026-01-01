/**
 * Alert Mutation Hooks
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { alertServices } from '@/lib/api/alerts';
import { QUERY_KEYS } from '@/lib/constants/query-keys';
import { toast } from 'sonner';
import type { AcknowledgeAlertDto, ResolveAlertDto } from '@/types';

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: AcknowledgeAlertDto }) =>
      alertServices.acknowledge(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ALERTS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ALERT(variables.id) });
      toast.success('Alert acknowledged');
    },
    onError: (error: Error) => {
      toast.error('Failed to acknowledge alert', { description: error.message });
    },
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: ResolveAlertDto }) =>
      alertServices.resolve(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ALERTS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ALERT(variables.id) });
      toast.success('Alert resolved');
    },
    onError: (error: Error) => {
      toast.error('Failed to resolve alert', { description: error.message });
    },
  });
}

