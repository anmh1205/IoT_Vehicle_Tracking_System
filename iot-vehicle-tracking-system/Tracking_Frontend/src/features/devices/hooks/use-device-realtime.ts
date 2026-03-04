'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription';
import { queryInvalidation } from '@/lib/utils/query-invalidation';

export const useDeviceRealtime = () => {
  const queryClient = useQueryClient();
  const refresh = useCallback(() => {
    queryInvalidation.device.list(queryClient);
  }, [queryClient]);

  useRealtimeSubscription({
    event: 'device:status',
    handler: refresh,
  });

  useRealtimeSubscription({
    event: 'device:position',
    handler: refresh,
  });
};
