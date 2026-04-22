import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription';
import {
  geofenceServices,
  type UpsertVehicleAllowedZonePayload,
  type VehicleAllowedZone,
} from '@/lib/api/geofences';

export const zoneQueryKey = (vehicleId: string | null | undefined) => ['vehicle-allowed-zone', vehicleId] as const;
export const previewQueryKey = (vehicleId: string | null | undefined) => [
  'vehicle-allowed-zone-preview',
  vehicleId,
] as const;

export const useVehicleAllowedZonePreview = (
  vehicleId: string | null | undefined,
  enabled = false,
) =>
  useQuery({
    queryKey: previewQueryKey(vehicleId),
    enabled: Boolean(vehicleId) && enabled,
    queryFn: () => geofenceServices.previewVehicleAllowedZoneCenter(vehicleId as string),
  });

export const useVehicleAllowedZone = (vehicleId: string | null | undefined) => {
  const queryClient = useQueryClient();
  const enabled = Boolean(vehicleId);
  const syncZoneCache = (zone: VehicleAllowedZone | null) => {
    queryClient.setQueryData(zoneQueryKey(vehicleId), zone);
    queryClient.setQueryData(previewQueryKey(vehicleId), null);
  };

  const zoneQuery = useQuery({
    queryKey: zoneQueryKey(vehicleId),
    enabled,
    queryFn: () => geofenceServices.getVehicleAllowedZone(vehicleId as string),
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: zoneQueryKey(vehicleId) }),
      queryClient.invalidateQueries({ queryKey: previewQueryKey(vehicleId) }),
      queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
      queryClient.invalidateQueries({ queryKey: ['vehicles-for-allowed-zone-page'] }),
      queryClient.invalidateQueries({ queryKey: ['device-positions'] }),
      queryClient.invalidateQueries({ queryKey: ['device-detail'] }),
    ]);
  };

  useRealtimeSubscription<{ vehicle_id?: string }>({
    event: 'geofence:allowed-zone-updated',
    enabled,
    handler: (payload) => {
      if (String(payload?.vehicle_id ?? '') !== vehicleId) return;
      void invalidate();
    },
  });

  useRealtimeSubscription<{ vehicle_id?: string }>({
    event: 'geofence:allowed-zone-state-changed',
    enabled,
    handler: (payload) => {
      if (String(payload?.vehicle_id ?? '') !== vehicleId) return;
      void queryClient.invalidateQueries({ queryKey: zoneQueryKey(vehicleId) });
    },
  });

  const upsertMutation = useMutation({
    mutationFn: (payload: UpsertVehicleAllowedZonePayload) =>
      geofenceServices.upsertVehicleAllowedZone(vehicleId as string, payload),
    onSuccess: async (zone) => {
      syncZoneCache(zone);
      await invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => geofenceServices.deleteVehicleAllowedZone(vehicleId as string),
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
