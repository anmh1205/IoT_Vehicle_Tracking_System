/**
 * Geofence Mutation Hooks
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { geofenceServices } from '@/lib/api/geofences';
import { QUERY_KEYS } from '@/lib/constants/query-keys';
import { toast } from 'sonner';
import type { CreateGeofenceDto, UpdateGeofenceDto, AssignVehiclesToGeofenceDto } from '@/types';

export function useCreateGeofence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateGeofenceDto) => geofenceServices.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GEOFENCES });
      toast.success('Geofence created successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to create geofence', { description: error.message });
    },
  });
}

export function useUpdateGeofence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: UpdateGeofenceDto }) =>
      geofenceServices.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GEOFENCES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GEOFENCE(variables.id) });
      toast.success('Geofence updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update geofence', { description: error.message });
    },
  });
}

export function useDeleteGeofence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => geofenceServices.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GEOFENCES });
      toast.success('Geofence deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete geofence', { description: error.message });
    },
  });
}

export function useAssignVehiclesToGeofence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: AssignVehiclesToGeofenceDto }) =>
      geofenceServices.assignVehicles(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GEOFENCES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GEOFENCE(variables.id) });
      toast.success('Vehicles assigned successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to assign vehicles', { description: error.message });
    },
  });
}

