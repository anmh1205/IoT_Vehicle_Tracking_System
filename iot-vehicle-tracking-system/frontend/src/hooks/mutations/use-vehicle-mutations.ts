/**
 * Vehicle Mutation Hooks
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { vehicleServices } from '@/lib/api/vehicles';
import { QUERY_KEYS } from '@/lib/constants/query-keys';
import { toast } from 'sonner';
import type { CreateVehicleDto, UpdateVehicleDto } from '@/types';

export function useCreateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateVehicleDto) => vehicleServices.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VEHICLES });
      toast.success('Vehicle created successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to create vehicle', { description: error.message });
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: UpdateVehicleDto }) =>
      vehicleServices.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VEHICLES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VEHICLE(variables.id) });
      toast.success('Vehicle updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update vehicle', { description: error.message });
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => vehicleServices.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VEHICLES });
      toast.success('Vehicle deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete vehicle', { description: error.message });
    },
  });
}

