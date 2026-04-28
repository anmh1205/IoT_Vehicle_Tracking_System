'use client';

import { useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription';
import { notificationUtils } from '@/lib/notification';
import { queryInvalidation } from '@/lib/utils/query-invalidation';
import {
  requestNotificationPermission,
  showAlertNotification,
} from '@/lib/utils/browser-notification';

export const useRealtimeEvents = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    void requestNotificationPermission();
  }, []);

  const onAlert = useCallback(
    (payload: any) => {
      queryInvalidation.notifications.all(queryClient);
      void queryClient.invalidateQueries({ queryKey: ['alerts'] });
      void queryClient.invalidateQueries({ queryKey: ['violations'] });

      showAlertNotification(payload);

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

  const onZoneStateChanged = useCallback((payload: any) => {
    const vehicleId = payload?.vehicle_id ?? payload?.device_id ?? 'Thiết bị';
    const state = String(payload?.membership_state ?? '').toLowerCase();

    if (state === 'outside') {
      notificationUtils.warning(`${vehicleId} đang ở ngoài vùng`);
      return;
    }

    if (state === 'inside') {
      notificationUtils.info(`${vehicleId} đã quay lại vùng`);
    }
  }, []);

  const onZoneUpdated = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['vehicles-for-zones-page'] });
  }, [queryClient]);

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
  useRealtimeSubscription({ event: 'zone:updated', handler: onZoneUpdated });
  useRealtimeSubscription({ event: 'zone:state-changed', handler: onZoneStateChanged });
  useRealtimeSubscription({ event: 'stats:update', handler: onStatsUpdated });
  useRealtimeSubscription({ event: 'activity:new', handler: onActivityCreated });
  useRealtimeSubscription({ event: 'device:session_start', handler: onDeviceSessionChanged });
  useRealtimeSubscription({ event: 'device:session_end', handler: onDeviceSessionChanged });
  useRealtimeSubscription({ event: 'command:ack', handler: onCommandAck });
};
