'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vehiclesApi } from '@/lib/api/vehicles';
import type { CreateVehicleInput, UpdateVehicleInput, VehicleListQuery } from '@/types/vehicle.types';

export function useVehicles(params?: VehicleListQuery) {
  return useQuery({
    queryKey: ['vehicles', params],
    queryFn: () => vehiclesApi.list(params).then((r) => r.data.data),
  });
}

export function useVehicleDetail(id: number | null) {
  return useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => vehiclesApi.getById(id!).then((r) => r.data.data),
    enabled: !!id,
  });
}

export function useCreateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateVehicleInput) =>
      vehiclesApi.create(data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicles'] }),
  });
}

export function useUpdateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateVehicleInput }) =>
      vehiclesApi.update(id, data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicles'] }),
  });
}

export function useDeleteVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => vehiclesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicles'] }),
  });
}

export function useAssignDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, deviceId }: { id: number; deviceId: string }) =>
      vehiclesApi.assignDevice(id, deviceId).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicles'] }),
  });
}

export function useUnassignDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      vehiclesApi.unassignDevice(id).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicles'] }),
  });
}
