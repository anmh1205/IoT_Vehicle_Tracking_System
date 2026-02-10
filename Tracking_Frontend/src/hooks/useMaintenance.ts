'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { maintenanceApi } from '@/lib/api/maintenance';
import type { CreateMaintenanceInput, UpdateMaintenanceInput, MaintenanceListQuery } from '@/types/maintenance.types';

export function useMaintenance(params?: MaintenanceListQuery) {
  return useQuery({
    queryKey: ['maintenance', params],
    queryFn: () => maintenanceApi.list(params).then((r) => r.data.data),
  });
}

export function useMaintenanceDetail(id: number | null) {
  return useQuery({
    queryKey: ['maintenance-detail', id],
    queryFn: () => maintenanceApi.getById(id!).then((r) => r.data.data),
    enabled: !!id,
  });
}

export function useCreateMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMaintenanceInput) =>
      maintenanceApi.create(data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['maintenance'] }),
  });
}

export function useUpdateMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateMaintenanceInput }) =>
      maintenanceApi.update(id, data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['maintenance'] }),
  });
}

export function useDeleteMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => maintenanceApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['maintenance'] }),
  });
}
