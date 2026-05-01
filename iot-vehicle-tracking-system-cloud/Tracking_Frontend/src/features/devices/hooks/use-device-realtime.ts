'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeContext } from '@/components/providers/socket-provider';
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription';
import type { Device } from '@/features/devices/types';

interface DeviceRealtimePayload {
  deviceId?: string;
  device_id?: string;
  status?: Device['currentStatus'];
  current_status?: Device['currentStatus'];
  ignitionState?: Device['ignitionState'];
  motionState?: Device['motionState'];
  vehicleState?: Device['vehicleState'];
  deviceState?: Device['deviceState'];
  sleepMode?: Device['sleepMode'];
  stateUpdatedAt?: string | null;
  lastSeenAt?: string;
  latitude?: number | null;
  longitude?: number | null;
}

const patchDevice = (device: Device, payload: DeviceRealtimePayload): Device => ({
  ...device,
  currentStatus: payload.status ?? payload.current_status ?? device.currentStatus,
  ignitionState: payload.ignitionState ?? device.ignitionState,
  motionState: payload.motionState ?? device.motionState,
  vehicleState: payload.vehicleState ?? device.vehicleState,
  deviceState: payload.deviceState ?? device.deviceState,
  sleepMode: payload.sleepMode ?? device.sleepMode,
  stateUpdatedAt: payload.stateUpdatedAt ?? device.stateUpdatedAt,
  lastSeenAt: payload.lastSeenAt ?? device.lastSeenAt,
  latitude: payload.latitude ?? device.latitude,
  longitude: payload.longitude ?? device.longitude,
});

const emptyDeviceIds: Array<string | number | null | undefined> = [];

const normalizeDeviceIds = (deviceIds: Array<string | number | null | undefined>) =>
  Array.from(
    new Set(
      deviceIds
        .map((deviceId) => String(deviceId ?? '').trim())
        .filter((deviceId) => deviceId.length > 0),
    ),
  );

export const useDeviceRealtime = (
  deviceIds: Array<string | number | null | undefined> = emptyDeviceIds,
) => {
  const queryClient = useQueryClient();
  const { joinDeviceRoom, leaveDeviceRoom } = useRealtimeContext();
  const joinedDeviceIds = useMemo(() => normalizeDeviceIds(deviceIds), [deviceIds]);

  useEffect(() => {
    joinedDeviceIds.forEach(joinDeviceRoom);
    return () => {
      joinedDeviceIds.forEach(leaveDeviceRoom);
    };
  }, [joinedDeviceIds, joinDeviceRoom, leaveDeviceRoom]);

  const isJoinedDevice = useCallback(
    (deviceId: string) => joinedDeviceIds.length === 0 || joinedDeviceIds.includes(deviceId),
    [joinedDeviceIds],
  );

  const patchDeviceLists = useCallback(
    (payload: DeviceRealtimePayload) => {
      const deviceId = String(payload.deviceId ?? payload.device_id ?? '');
      if (!deviceId || !isJoinedDevice(deviceId)) {
        return;
      }

      queryClient.setQueriesData({ queryKey: ['devices'] }, (current: any) => {
        if (!current || !Array.isArray(current.items)) {
          return current;
        }

        let changed = false;
        const items = current.items.map((device: Device) => {
          if (device.deviceId !== deviceId) {
            return device;
          }
          changed = true;
          return patchDevice(device, payload);
        });

        return changed ? { ...current, items } : current;
      });
    },
    [isJoinedDevice, queryClient],
  );

  const refreshDeviceLists = useCallback(
    (payload: DeviceRealtimePayload) => {
      const deviceId = String(payload.deviceId ?? payload.device_id ?? '');
      if (deviceId && !isJoinedDevice(deviceId)) {
        return;
      }
      void queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
    [isJoinedDevice, queryClient],
  );

  useRealtimeSubscription({
    namespace: 'devices',
    event: 'device:status',
    handler: patchDeviceLists,
  });

  useRealtimeSubscription({
    namespace: 'devices',
    event: 'device:position',
    handler: patchDeviceLists,
  });

  useRealtimeSubscription({
    namespace: 'devices',
    event: 'device:session_start',
    handler: refreshDeviceLists,
  });

  useRealtimeSubscription({
    namespace: 'devices',
    event: 'device:session_end',
    handler: refreshDeviceLists,
  });
};
