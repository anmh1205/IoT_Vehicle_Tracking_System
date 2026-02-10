'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertsApi } from '@/lib/api/alerts';
import type { CreateAlertInput, UpdateAlertInput, AlertListQuery } from '@/types/alert.types';

export function useAlerts(params?: AlertListQuery) {
  return useQuery({
    queryKey: ['alerts', params],
    queryFn: () => alertsApi.list(params).then((r) => r.data.data),
  });
}

export function useAlertDetail(id: number | null) {
  return useQuery({
    queryKey: ['alert', id],
    queryFn: () => alertsApi.getById(id!).then((r) => r.data.data),
    enabled: !!id,
  });
}

export function useCreateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAlertInput) =>
      alertsApi.create(data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });
}

export function useUpdateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateAlertInput }) =>
      alertsApi.update(id, data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });
}

export function useAcknowledgeAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      alertsApi.acknowledge(id).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });
}

export function useResolveAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: number; notes?: string }) =>
      alertsApi.resolve(id, notes).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });
}

export function useDismissAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      alertsApi.dismiss(id).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });
}
