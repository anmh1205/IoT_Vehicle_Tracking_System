'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription';
import { notificationUtils } from '@/lib/notification';
import type { Device } from '@/features/devices/types';
import { useDeleteDevice } from '@/features/devices/hooks/use-delete-device';
import { useDeviceDetail } from '@/features/devices/hooks/use-device-detail';
import { useDeviceErrorCodes } from '@/features/devices/hooks/use-device-error-codes';
import { useDeviceRuntimeChart } from '@/features/devices/hooks/use-device-runtime-chart';
import { useDeviceSessions } from '@/features/devices/hooks/use-device-sessions';
import { useDeviceVibrationChart } from '@/features/devices/hooks/use-device-vibration-chart';
import { useSendCommand } from '@/features/devices/hooks/use-send-command';
import { useUpdateDevice } from '@/features/devices/hooks/use-update-device';
import { useUpdateDeviceSettings } from '@/features/devices/hooks/use-update-device-settings';
import { DeviceDetailModal } from './index';
import type { DeviceDetailTab } from '@/features/devices/components/device-constants';

export const DeviceDetailModalContainer = ({
  device,
  open,
  onOpenChange,
}: {
  device: Device | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const [activeTab, setActiveTab] = useState<DeviceDetailTab>('overview');
  const queryClient = useQueryClient();
  const deviceId = device?.id ?? null;

  const detail = useDeviceDetail(deviceId);
  const sessions = useDeviceSessions(deviceId, { pageSize: 10 });
  const errors = useDeviceErrorCodes(deviceId, 10);
  const runtime = useDeviceRuntimeChart(deviceId);
  const vibration = useDeviceVibrationChart(deviceId);
  const updateName = useUpdateDevice();
  const updateSettings = useUpdateDeviceSettings(deviceId);
  const deleteDevice = useDeleteDevice();
  const sendCommand = useSendCommand(deviceId ?? 0);

  const refreshCurrent = useCallback(async () => {
    if (!deviceId) {
      return;
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['devices'] }),
      queryClient.invalidateQueries({ queryKey: ['device', deviceId] }),
      queryClient.invalidateQueries({ queryKey: ['device-detail', deviceId] }),
      queryClient.invalidateQueries({ queryKey: ['device-sessions', deviceId] }),
      queryClient.invalidateQueries({ queryKey: ['device-errors', deviceId] }),
      queryClient.invalidateQueries({ queryKey: ['device-runtime-chart', deviceId] }),
      queryClient.invalidateQueries({ queryKey: ['device-vibration-chart', deviceId] }),
      queryClient.invalidateQueries({ queryKey: ['device-commands', deviceId] }),
    ]);
  }, [deviceId, queryClient]);

  useRealtimeSubscription<any>({
    event: 'device.status.changed',
    enabled: open && !!deviceId,
    handler: (payload) => {
      const payloadId = String(payload?.device_id ?? payload?.deviceId ?? '');
      if (payloadId && payloadId !== String(detail.data?.device?.deviceId)) return;
      void refreshCurrent();
    },
  });

  useRealtimeSubscription<any>({
    event: 'device.sessions.updated',
    enabled: open && !!deviceId,
    handler: (payload) => {
      const payloadId = String(payload?.device_id ?? payload?.deviceId ?? '');
      if (payloadId && payloadId !== String(detail.data?.device?.deviceId)) return;
      void refreshCurrent();
    },
  });

  useRealtimeSubscription({
    event: 'device:status',
    enabled: open && !!deviceId,
    handler: () => {
      void refreshCurrent();
    },
  });

  const context = useMemo(
    () => ({
      device: detail.data?.device ?? device,
      runtime: detail.data?.runtime ?? null,
      loading: detail.isLoading,
      error: detail.error as Error | null,
      sessions: sessions.sessions,
      sessionsLoading: sessions.isLoading || sessions.isFetching,
      sessionsHasMore: sessions.hasMore,
      onSessionsLoadMore: sessions.onLoadMore,
      errorCodes: errors.items,
      errorCodesTotal: errors.total,
      errorCodesPage: errors.page,
      errorCodesStatus: errors.status,
      errorCodesType: errors.type,
      onErrorCodesPageChange: errors.onPageChange,
      onErrorCodesStatusChange: errors.onStatusChange,
      onErrorCodesTypeChange: errors.onTypeChange,
      runtimeChart: runtime.data,
      runtimeRange: runtime.range,
      onRuntimeRangeChange: runtime.onRangeChange,
      vibrationChart: vibration.data,
      vibrationPeriod: vibration.period,
      onVibrationPeriodChange: vibration.onPeriodChange,
      activeTab,
      onTabChange: setActiveTab,
      onUpdateNameId: async (data: Record<string, unknown>) => {
        if (!deviceId) return;
        await updateName.mutateAsync({ id: deviceId, ...data });
      },
      onUpdateSettings: async (data: Record<string, unknown>) => {
        await updateSettings.mutateAsync(data);
      },
      onDeleteDevice: async () => {
        if (!deviceId) return;
        await deleteDevice.mutateAsync(deviceId);
        onOpenChange(false);
      },
      onSendCommand: async (command: string) => {
        await sendCommand.mutateAsync({ command });
        notificationUtils.success('Đã gửi lệnh', `Lệnh: ${command}`);
      },
      onRefresh: async () => {
        await refreshCurrent();
        notificationUtils.success('Đã làm mới dữ liệu thiết bị');
      },
      openExportModal: () => undefined,
    }),
    [
      activeTab,
      deleteDevice,
      detail.data?.device,
      detail.data?.runtime,
      detail.error,
      detail.isLoading,
      device,
      deviceId,
      errors.items,
      errors.onPageChange,
      errors.onStatusChange,
      errors.onTypeChange,
      errors.page,
      errors.status,
      errors.total,
      errors.type,
      onOpenChange,
      refreshCurrent,
      runtime.data,
      runtime.onRangeChange,
      runtime.range,
      sendCommand,
      sessions.hasMore,
      sessions.isFetching,
      sessions.isLoading,
      sessions.onLoadMore,
      sessions.sessions,
      updateName,
      updateSettings,
      vibration.data,
      vibration.onPeriodChange,
      vibration.period,
    ],
  );

  return (
    <DeviceDetailModal
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setActiveTab('overview');
        }
        onOpenChange(next);
      }}
      context={context}
    />
  );
};
