/**
 * Trip Mutation Hooks
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tripServices } from '@/lib/api/trips';
import { QUERY_KEYS } from '@/lib/constants/query-keys';
import { toast } from 'sonner';
import type { CreateTripDto, UpdateTripDto } from '@/lib/api/trips';

export function useCreateTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTripDto) => tripServices.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRIPS });
      toast.success('Trip created successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to create trip', { description: error.message });
    },
  });
}

export function useUpdateTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: UpdateTripDto }) =>
      tripServices.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRIPS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRIP(variables.id) });
      toast.success('Trip updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update trip', { description: error.message });
    },
  });
}

