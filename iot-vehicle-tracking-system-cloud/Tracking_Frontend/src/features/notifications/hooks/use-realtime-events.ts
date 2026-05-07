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

  const refreshNotifications = useCallback(() => {
    queryInvalidation.notifications.all(queryClient);
    void queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
  }, [queryClient]);

  const onAlert = useCallback(
    (payload: any) => {
      refreshNotifications();
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
    [queryClient, refreshNotifications],
  );

  const onExportReady = useCallback(() => {
    queryInvalidation.exports.all(queryClient);
    refreshNotifications();
    notificationUtils.success('Xuất dữ liệu hoàn tất');
  }, [queryClient, refreshNotifications]);

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

  const refreshAlertViews = useCallback(() => {
    refreshNotifications();
    void queryClient.invalidateQueries({ queryKey: ['alerts'] });
    void queryClient.invalidateQueries({ queryKey: ['violations'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard-recent-alerts'] });
    queryInvalidation.dashboard.stats(queryClient);
  }, [queryClient, refreshNotifications]);

  useRealtimeSubscription({ namespace: 'notifications', event: 'alert:new', handler: onAlert });
  useRealtimeSubscription({ namespace: 'notifications', event: 'alert:updated', handler: refreshAlertViews });
  useRealtimeSubscription({ namespace: 'notifications', event: 'alert:deleted', handler: refreshAlertViews });
  useRealtimeSubscription({ namespace: 'notifications', event: 'violation:new', handler: refreshAlertViews });
  useRealtimeSubscription({ namespace: 'notifications', event: 'violation:updated', handler: refreshAlertViews });
  useRealtimeSubscription({ namespace: 'notifications', event: 'notification:new', handler: refreshNotifications });
  useRealtimeSubscription({ namespace: 'notifications', event: 'notification:updated', handler: refreshNotifications });
  useRealtimeSubscription({ namespace: 'exports', event: 'export:ready', handler: onExportReady });
  useRealtimeSubscription({ namespace: 'notifications', event: 'zone:updated', handler: onZoneUpdated });
  useRealtimeSubscription({ namespace: 'notifications', event: 'zone:state-changed', handler: onZoneStateChanged });
  useRealtimeSubscription({ namespace: 'dashboard', event: 'stats:update', handler: onStatsUpdated });
  useRealtimeSubscription({ namespace: 'dashboard', event: 'activity:new', handler: onActivityCreated });
};
