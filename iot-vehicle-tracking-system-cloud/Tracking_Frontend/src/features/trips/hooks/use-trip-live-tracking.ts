import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDeviceRoom } from '@/components/providers/socket-provider';
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription';

/**
 * Hook to subscribe to real-time GPS position updates for an active trip.
 * When new position data arrives via WebSocket, invalidates the trip telemetry
 * query to fetch fresh data — replacing timed polling with event-driven updates.
 */
export const useTripLiveTracking = (
  tripId: number,
  isActive: boolean,
  deviceId?: string | null,
) => {
  const queryClient = useQueryClient();
  useDeviceRoom(deviceId, isActive && !!deviceId);

  const onPositionUpdate = useCallback(
    (payload: { deviceId?: string; device_id?: string }) => {
      const nextDeviceId = String(payload.deviceId ?? payload.device_id ?? '');
      if (deviceId && nextDeviceId && nextDeviceId !== deviceId) {
        return;
      }

      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['trip-telemetry', tripId] }),
        queryClient.invalidateQueries({ queryKey: ['trip-preview-telemetry', tripId] }),
      ]);
    },
    [deviceId, queryClient, tripId],
  );

  useRealtimeSubscription({
    namespace: 'devices',
    event: 'device:position',
    handler: onPositionUpdate,
    enabled: isActive,
  });
};
