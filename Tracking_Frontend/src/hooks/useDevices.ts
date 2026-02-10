'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { devicesApi } from '@/lib/api/devices';
import type {
  DeviceListQuery,
  CreateDeviceInput,
  UpdateDeviceInput,
} from '@/types/device.types';

export function useDevices(params?: DeviceListQuery) {
  return useQuery({
    queryKey: ['devices', params],
    queryFn: () => devicesApi.list(params).then((r) => r.data.data),
  });
}

export function useDeviceDetail(id: number | null) {
  return useQuery({
    queryKey: ['device', id],
    queryFn: () => devicesApi.getById(id!).then((r) => r.data.data),
    enabled: !!id,
  });
}

export function useCreateDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDeviceInput) =>
      devicesApi.create(data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['devices'] }),
  });
}

export function useUpdateDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateDeviceInput }) =>
      devicesApi.update(id, data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['devices'] }),
  });
}

export function useDeleteDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => devicesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['devices'] }),
  });
}
