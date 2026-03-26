import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription';

/**
 * Hook to subscribe to real-time GPS position updates for an active trip.
 * When new position data arrives via WebSocket, invalidates the trip telemetry
 * query to fetch fresh data — replacing timed polling with event-driven updates.
 */
export const useTripLiveTracking = (tripId: number, isActive: boolean) => {
  const queryClient = useQueryClient();

  const onPositionUpdate = useCallback(() => {
    // Invalidate telemetry query to fetch latest GPS data from VictoriaMetrics
    void queryClient.invalidateQueries({ queryKey: ['trip-telemetry', tripId] });
  }, [queryClient, tripId]);

  useRealtimeSubscription({
    event: 'device:position',
    handler: onPositionUpdate,
    enabled: isActive,
  });
};
