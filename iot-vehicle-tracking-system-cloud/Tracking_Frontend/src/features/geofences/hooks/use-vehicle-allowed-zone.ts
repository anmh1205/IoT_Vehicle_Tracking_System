import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription';
import {
  zoneServices,
  type UpsertVehicleZonePayload,
  type VehicleZone,
} from '@/lib/api/zones';

export const zoneQueryKey = (vehicleId: string | null | undefined) => ['vehicle-zone', vehicleId] as const;
export const previewQueryKey = (vehicleId: string | null | undefined) => [
  'vehicle-zone-preview',
  vehicleId,
] as const;

export const useVehicleAllowedZonePreview = (
  vehicleId: string | null | undefined,
  enabled = false,
) =>
  useQuery({
    queryKey: previewQueryKey(vehicleId),
    enabled: Boolean(vehicleId) && enabled,
    queryFn: () => zoneServices.previewVehicleZoneCircleCenter(vehicleId as string),
  });

export const useVehicleAllowedZone = (
  vehicleId: string | null | undefined,
  options?: { enabled?: boolean },
) => {
  const queryClient = useQueryClient();
  const enabled = Boolean(vehicleId) && (options?.enabled ?? true);
  const syncZoneCache = (zone: VehicleZone | null) => {
    queryClient.setQueryData(zoneQueryKey(vehicleId), zone);
    queryClient.setQueryData(previewQueryKey(vehicleId), null);
  };

  const zoneQuery = useQuery({
    queryKey: zoneQueryKey(vehicleId),
    enabled,
    queryFn: () => zoneServices.getVehicleZone(vehicleId as string),
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: zoneQueryKey(vehicleId) }),
      queryClient.invalidateQueries({ queryKey: previewQueryKey(vehicleId) }),
      queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
      queryClient.invalidateQueries({ queryKey: ['vehicles-for-zones-page'] }),
      queryClient.invalidateQueries({ queryKey: ['vehicles-for-allowed-zone-page'] }),
      queryClient.invalidateQueries({ queryKey: ['device-positions'] }),
      queryClient.invalidateQueries({ queryKey: ['device-detail'] }),
    ]);
  };

  useRealtimeSubscription<{ vehicle_id?: string }>({
    event: 'zone:updated',
    enabled,
    handler: (payload) => {
      if (String(payload?.vehicle_id ?? '') !== vehicleId) return;
      void invalidate();
    },
  });

  useRealtimeSubscription<{ vehicle_id?: string }>({
    event: 'zone:state-changed',
    enabled,
    handler: (payload) => {
      if (String(payload?.vehicle_id ?? '') !== vehicleId) return;
      void queryClient.invalidateQueries({ queryKey: zoneQueryKey(vehicleId) });
    },
  });

  const upsertMutation = useMutation({
    mutationFn: (payload: UpsertVehicleZonePayload) =>
      zoneServices.upsertVehicleZone(vehicleId as string, payload),
    onSuccess: async (zone) => {
      syncZoneCache(zone);
      await invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => zoneServices.deleteVehicleZone(vehicleId as string),
    onSuccess: async () => {
      syncZoneCache(null);
      await invalidate();
    },
  });

  return {
    zoneQuery,
    upsertMutation,
    deleteMutation,
    refresh: invalidate,
  };
};

export const useVehicleZone = useVehicleAllowedZone;
