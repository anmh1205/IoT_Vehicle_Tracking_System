'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeContext } from '@/components/providers/socket-provider';
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription';
import type { Device, DeviceAlertSummary } from '@/features/devices/types';

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
  timestamp?: number | string | null;
  latitude?: number | null;
  longitude?: number | null;
  deviceAlerts?: Partial<DeviceAlertSummary> | null;
  ecuAlerts?: Partial<DeviceAlertSummary> | null;
}

const toIsoTimestamp = (value: number | string | null | undefined): string | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const timestamp = typeof value === 'number' ? value : Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return null;
  }
  return new Date(timestamp).toISOString();
};

const patchAlertSummary = (
  current: DeviceAlertSummary,
  next: Partial<DeviceAlertSummary> | null | undefined,
): DeviceAlertSummary => {
  if (!next) {
    return current;
  }
  return {
    source: next.source ?? current.source,
    count: Number(next.count ?? current.count ?? 0),
    highestSeverity: next.highestSeverity ?? current.highestSeverity,
    titles: Array.isArray(next.titles) ? next.titles : current.titles,
  };
};

const patchDevice = (device: Device, payload: DeviceRealtimePayload): Device => ({
  ...device,
  currentStatus: payload.status ?? payload.current_status ?? device.currentStatus,
  ignitionState: payload.ignitionState ?? device.ignitionState,
  motionState: payload.motionState ?? device.motionState,
  vehicleState: payload.vehicleState ?? device.vehicleState,
  deviceState: payload.deviceState ?? device.deviceState,
  sleepMode: payload.sleepMode ?? device.sleepMode,
  stateUpdatedAt: payload.stateUpdatedAt ?? device.stateUpdatedAt,
  lastSeenAt: payload.lastSeenAt ?? toIsoTimestamp(payload.timestamp) ?? device.lastSeenAt,
  latitude: payload.latitude ?? device.latitude,
  longitude: payload.longitude ?? device.longitude,
  deviceAlerts: patchAlertSummary(device.deviceAlerts, payload.deviceAlerts),
  ecuAlerts: patchAlertSummary(device.ecuAlerts, payload.ecuAlerts),
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

const patchItems = (
  items: Device[],
  deviceId: string,
  payload: DeviceRealtimePayload,
): { items: Device[]; changed: boolean } => {
  let changed = false;
  const patchedItems = items.map((device) => {
    if (device.deviceId !== deviceId) {
      return device;
    }
    changed = true;
    return patchDevice(device, payload);
  });

  return { items: patchedItems, changed };
};

export const patchDeviceListCacheValue = (
  current: any,
  deviceId: string,
  payload: DeviceRealtimePayload,
) => {
  if (!current) {
    return current;
  }

  if (Array.isArray(current.items)) {
    const { items, changed } = patchItems(current.items, deviceId, payload);
    return changed ? { ...current, items } : current;
  }

  if (Array.isArray(current.pages)) {
    let changed = false;
    const pages = current.pages.map((page: any) => {
      if (!Array.isArray(page?.items)) {
        return page;
      }
      const patched = patchItems(page.items, deviceId, payload);
      if (!patched.changed) {
        return page;
      }
      changed = true;
      return { ...page, items: patched.items };
    });

    return changed ? { ...current, pages } : current;
  }

  return current;
};

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
        return patchDeviceListCacheValue(current, deviceId, payload);
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

  useRealtimeSubscription({
    namespace: 'devices',
    event: 'device:session_discarded',
    handler: refreshDeviceLists,
  });
};
