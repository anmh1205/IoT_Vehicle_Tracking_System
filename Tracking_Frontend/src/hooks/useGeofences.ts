'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { geofencesApi } from '@/lib/api/geofences';
import type {
  CreateGeofenceInput,
  UpdateGeofenceInput,
} from '@/types/geofence.types';

export function useGeofences(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['geofences', params],
    queryFn: () => geofencesApi.list(params).then((r) => r.data.data),
  });
}

export function useGeofenceDetail(id: number | null) {
  return useQuery({
    queryKey: ['geofence', id],
    queryFn: () => geofencesApi.getById(id!).then((r) => r.data.data),
    enabled: !!id,
  });
}

export function useCreateGeofence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateGeofenceInput) =>
      geofencesApi.create(data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['geofences'] }),
  });
}

export function useUpdateGeofence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateGeofenceInput }) =>
      geofencesApi.update(id, data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['geofences'] }),
  });
}

export function useDeleteGeofence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => geofencesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['geofences'] }),
  });
}
