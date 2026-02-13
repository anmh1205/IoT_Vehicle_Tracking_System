'use client';
import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DeviceDetailModal } from './index';
import type { DeviceDetailTab } from '@/features/devices/components/device-constants';
import { useDeviceDetail } from '@/features/devices/hooks/use-device-detail';
import { useDeviceSessions } from '@/features/devices/hooks/use-device-sessions';
import { useDeviceErrorCodes } from '@/features/devices/hooks/use-device-error-codes';
import { useDeviceRuntimeChart } from '@/features/devices/hooks/use-device-runtime-chart';
import { useDeviceVibrationChart } from '@/features/devices/hooks/use-device-vibration-chart';
import { useUpdateDevice } from '@/features/devices/hooks/use-update-device';
import { useUpdateDeviceSettings } from '@/features/devices/hooks/use-update-device-settings';
import { useDeleteDevice } from '@/features/devices/hooks/use-delete-device';
import { useSendCommand } from '@/features/devices/hooks/use-send-command';
import { notificationUtils } from '@/lib/notification';
import { queryInvalidation } from '@/lib/utils/query-invalidation';
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription';
import type { Device } from '@/features/devices/types';
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
  const invalidateCurrent = useCallback(() => {
    if (!deviceId) return;
    queryInvalidation.device.all(queryClient, deviceId);
  }, [deviceId, queryClient]);
  useRealtimeSubscription<any>({
    event: 'device.status.changed',
    enabled: open && !!deviceId,
    handler: (payload) => {
      const payloadId = String(payload?.device_id ?? payload?.deviceId ?? '');
      if (payloadId && payloadId !== String(detail.data?.device?.deviceId)) return;
      invalidateCurrent();
    },
  });
  useRealtimeSubscription<any>({
    event: 'device.sessions.updated',
    enabled: open && !!deviceId,
    handler: (payload) => {
      const payloadId = String(payload?.device_id ?? payload?.deviceId ?? '');
      if (payloadId && payloadId !== String(detail.data?.device?.deviceId)) return;
      invalidateCurrent();
    },
  });
  useRealtimeSubscription({
    event: 'device:status',
    enabled: open && !!deviceId,
    handler: invalidateCurrent,
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
      openExportModal: () => undefined,
    }),
    [
      detail.data?.device,
      detail.data?.runtime,
      detail.isLoading,
      detail.error,
      device,
      sessions.sessions,
      sessions.isLoading,
      sessions.isFetching,
      sessions.hasMore,
      sessions.onLoadMore,
      errors.items,
      errors.total,
      errors.page,
      errors.status,
      errors.type,
      errors.onPageChange,
      errors.onStatusChange,
      errors.onTypeChange,
      runtime.data,
      runtime.range,
      runtime.onRangeChange,
      vibration.data,
      vibration.period,
      vibration.onPeriodChange,
      activeTab,
      updateName,
      deviceId,
      updateSettings,
      deleteDevice,
      onOpenChange,
      sendCommand,
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
