import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription';
import { queryInvalidation } from '@/lib/utils/query-invalidation';
export const useDashboardRealtime = () => {
  const queryClient = useQueryClient();
  const refreshStats = useCallback(() => {
    queryInvalidation.dashboard.stats(queryClient);
  }, [queryClient]);
  const refreshActivity = useCallback(() => {
    queryInvalidation.dashboard.activity(queryClient);
  }, [queryClient]);
  useRealtimeSubscription({
    namespace: 'dashboard',
    event: 'stats:update',
    handler: refreshStats,
  });
  useRealtimeSubscription({
    namespace: 'dashboard',
    event: 'alert:new',
    handler: refreshActivity,
  });
  useRealtimeSubscription({
    namespace: 'dashboard',
    event: 'activity:new',
    handler: refreshActivity,
  });
};
