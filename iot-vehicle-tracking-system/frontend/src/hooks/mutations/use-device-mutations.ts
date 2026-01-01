/**
 * Device Mutation Hooks
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deviceServices } from '@/lib/api/devices';
import { QUERY_KEYS } from '@/lib/constants/query-keys';
import { toast } from 'sonner';
import type { CreateDeviceDto, UpdateDeviceDto, AssignDeviceDto } from '@/types';

export function useCreateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDeviceDto) => deviceServices.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DEVICES });
      toast.success('Device created successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to create device', { description: error.message });
    },
  });
}

export function useUpdateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: UpdateDeviceDto }) =>
      deviceServices.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DEVICES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DEVICE(variables.id) });
      toast.success('Device updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update device', { description: error.message });
    },
  });
}

export function useDeleteDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => deviceServices.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DEVICES });
      toast.success('Device deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete device', { description: error.message });
    },
  });
}

export function useAssignDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: AssignDeviceDto }) =>
      deviceServices.assignToVehicle(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DEVICES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DEVICE(variables.id) });
      toast.success('Device assigned successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to assign device', { description: error.message });
    },
  });
}

