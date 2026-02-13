'use client';
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription';
import { notificationUtils } from '@/lib/notification';
import { queryInvalidation } from '@/lib/utils/query-invalidation';
export const useRealtimeEvents = () => {
  const queryClient = useQueryClient();
  const onAlert = useCallback(
    (payload: any) => {
      queryInvalidation.notifications.all(queryClient);
      void queryClient.invalidateQueries({ queryKey: ['alerts'] });
      if (payload?.severity === 'critical') {
        notificationUtils.error(payload?.title ?? 'Cảnh báo mức nghiêm trọng');
        return;
      }
      if (payload?.severity === 'high') {
        notificationUtils.warning(payload?.title ?? 'Cảnh báo mức cao');
        return;
      }
      notificationUtils.info(payload?.title ?? 'Cảnh báo mới');
    },
    [queryClient],
  );
  const onExportReady = useCallback(() => {
    queryInvalidation.exports.all(queryClient);
    queryInvalidation.notifications.all(queryClient);
    notificationUtils.success('Xuất dữ liệu hoàn tất');
  }, [queryClient]);
  const onGeofenceEnter = useCallback((payload: any) => {
    notificationUtils.warning(
      `${payload?.deviceId ?? 'Thiết bị'} vào vùng giám sát ${payload?.geofenceName ?? ''}`.trim(),
    );
  }, []);
  const onGeofenceExit = useCallback((payload: any) => {
    notificationUtils.info(
      `${payload?.deviceId ?? 'Thiết bị'} ra khỏi vùng giám sát ${payload?.geofenceName ?? ''}`.trim(),
    );
  }, []);
  const onStatsUpdated = useCallback(() => {
    queryInvalidation.dashboard.stats(queryClient);
  }, [queryClient]);
  const onActivityCreated = useCallback(() => {
    queryInvalidation.dashboard.activity(queryClient);
  }, [queryClient]);
  const onDeviceSessionChanged = useCallback(() => {
    queryInvalidation.device.list(queryClient);
  }, [queryClient]);
  const onCommandAck = useCallback(() => {
    queryInvalidation.device.commands(queryClient);
  }, [queryClient]);
  useRealtimeSubscription({ event: 'alert:new', handler: onAlert });
  useRealtimeSubscription({ event: 'export:ready', handler: onExportReady });
  useRealtimeSubscription({ event: 'geofence:enter', handler: onGeofenceEnter });
  useRealtimeSubscription({ event: 'geofence:exit', handler: onGeofenceExit });
  useRealtimeSubscription({ event: 'stats:update', handler: onStatsUpdated });
  useRealtimeSubscription({ event: 'activity:new', handler: onActivityCreated });
  useRealtimeSubscription({ event: 'device:session_start', handler: onDeviceSessionChanged });
  useRealtimeSubscription({ event: 'device:session_end', handler: onDeviceSessionChanged });
  useRealtimeSubscription({ event: 'command:ack', handler: onCommandAck });
};
