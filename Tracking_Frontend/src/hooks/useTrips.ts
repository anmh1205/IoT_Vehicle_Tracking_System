'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tripsApi } from '@/lib/api/trips';
import type { CreateTripInput, UpdateTripInput, TripListQuery } from '@/types/trip.types';

export function useTrips(params?: TripListQuery) {
  return useQuery({
    queryKey: ['trips', params],
    queryFn: () => tripsApi.list(params).then((r) => r.data.data),
  });
}

export function useTripDetail(id: number | null) {
  return useQuery({
    queryKey: ['trip', id],
    queryFn: () => tripsApi.getById(id!).then((r) => r.data.data),
    enabled: !!id,
  });
}

export function useCreateTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTripInput) =>
      tripsApi.create(data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trips'] }),
  });
}

export function useUpdateTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTripInput }) =>
      tripsApi.update(id, data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trips'] }),
  });
}

export function useStartTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      tripsApi.startTrip(id).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trips'] }),
  });
}

export function useEndTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      tripsApi.endTrip(id).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trips'] }),
  });
}
