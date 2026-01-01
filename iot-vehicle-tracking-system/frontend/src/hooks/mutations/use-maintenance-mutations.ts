/**
 * Maintenance Mutation Hooks
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { maintenanceServices } from '@/lib/api/maintenance';
import { QUERY_KEYS } from '@/lib/constants/query-keys';
import { toast } from 'sonner';
import type { CreateMaintenanceDto, UpdateMaintenanceDto } from '@/types';

export function useCreateMaintenance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMaintenanceDto) => maintenanceServices.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MAINTENANCE });
      toast.success('Maintenance record created successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to create maintenance record', { description: error.message });
    },
  });
}

export function useUpdateMaintenance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: UpdateMaintenanceDto }) =>
      maintenanceServices.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MAINTENANCE });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MAINTENANCE_RECORD(variables.id) });
      toast.success('Maintenance record updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update maintenance record', { description: error.message });
    },
  });
}

export function useDeleteMaintenance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => maintenanceServices.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MAINTENANCE });
      toast.success('Maintenance record deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete maintenance record', { description: error.message });
    },
  });
}

