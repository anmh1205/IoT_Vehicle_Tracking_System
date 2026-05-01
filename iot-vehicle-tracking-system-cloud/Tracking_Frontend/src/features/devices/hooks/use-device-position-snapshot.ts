import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDeviceRoom } from '@/components/providers/socket-provider';
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription';
import { deviceServices } from '@/lib/api/devices';
import type { DevicePositionSnapshot } from '@/features/devices/types';

const toNumberOrNull = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toAlertSummary = (raw: any, source: 'device' | 'ecu'): DevicePositionSnapshot['deviceAlerts'] => ({
  source,
  count: Number(raw?.count ?? 0),
  highestSeverity: (raw?.highestSeverity ?? raw?.highest_severity ?? 'none') as DevicePositionSnapshot['deviceAlerts']['highestSeverity'],
  titles: Array.isArray(raw?.titles)
    ? raw.titles
        .map((item: unknown) => String(item ?? '').trim())
        .filter((item: string) => item.length > 0)
    : [],
});

const normalizePosition = (row: any): DevicePositionSnapshot => ({
  deviceId: String(row?.deviceId ?? ''),
  deviceName: String(row?.deviceName ?? row?.deviceId ?? ''),
  vehiclePlate: row?.vehiclePlate ?? null,
  customerName: row?.customerName ?? null,
  latitude: toNumberOrNull(row?.latitude),
  longitude: toNumberOrNull(row?.longitude),
  speed: toNumberOrNull(row?.speed),
  heading: toNumberOrNull(row?.course),
  status: String(row?.currentStatus ?? row?.status ?? 'disconnected'),
  ignitionState: (row?.ignitionState ?? null) as DevicePositionSnapshot['ignitionState'],
  motionState: (row?.motionState ?? null) as DevicePositionSnapshot['motionState'],
  vehicleState: (row?.vehicleState ?? null) as DevicePositionSnapshot['vehicleState'],
  deviceState: (row?.deviceState ?? null) as DevicePositionSnapshot['deviceState'],
  sleepMode: (row?.sleepMode ?? null) as DevicePositionSnapshot['sleepMode'],
  stateUpdatedAt: row?.stateUpdatedAt ?? null,
  timestamp: row?.lastSeenAt ?? row?.timestamp ?? null,
  deviceBattery: toNumberOrNull(row?.deviceBattery),
  vehicleBattery: toNumberOrNull(row?.vehicleBattery),
  vibration: toNumberOrNull(row?.vibration),
  errorCode: toNumberOrNull(row?.errorCode),
  temperature: toNumberOrNull(row?.temperature),
  engineTemperature: toNumberOrNull(row?.engineTemperature),
  rpm: toNumberOrNull(row?.rpm),
  activeAlertCount: Math.max(0, Number(row?.activeAlertCount ?? 0) || 0),
  activeAlertTitles: Array.isArray(row?.activeAlertTitles)
    ? row.activeAlertTitles.filter(
        (item: unknown): item is string => typeof item === 'string' && item.trim().length > 0,
      )
    : [],
  deviceAlerts: toAlertSummary(row?.deviceAlerts ?? {}, 'device'),
  ecuAlerts: toAlertSummary(row?.ecuAlerts ?? {}, 'ecu'),
});

export const useDevicePositionSnapshot = (devicePublicId: string | null, enabled = true) => {
  const queryClient = useQueryClient();
  useDeviceRoom(devicePublicId, enabled && !!devicePublicId);

  const query = useQuery({
    queryKey: ['device-position-snapshot', devicePublicId],
    queryFn: () => deviceServices.getPositions(),
    enabled: enabled && !!devicePublicId,
  });

  const refreshSnapshot = (payload: { deviceId?: string; device_id?: string }) => {
    const nextDeviceId = String(payload.deviceId ?? payload.device_id ?? '');
    if (nextDeviceId === String(devicePublicId ?? '')) {
      void queryClient.invalidateQueries({ queryKey: ['device-position-snapshot', devicePublicId] });
    }
  };

  useRealtimeSubscription({
    namespace: 'devices',
    event: 'device:position',
    enabled: enabled && !!devicePublicId,
    handler: refreshSnapshot,
  });

  useRealtimeSubscription({
    namespace: 'devices',
    event: 'device:status',
    enabled: enabled && !!devicePublicId,
    handler: refreshSnapshot,
  });

  const position = useMemo(() => {
    const items = Array.isArray(query.data?.items)
      ? query.data.items
      : Array.isArray(query.data?.data?.items)
        ? query.data.data.items
        : Array.isArray(query.data?.data)
          ? query.data.data
          : Array.isArray(query.data)
            ? query.data
            : [];

    const matched = items.find(
      (item: any) => String(item?.deviceId ?? '') === String(devicePublicId ?? ''),
    );

    return matched ? normalizePosition(matched) : null;
  }, [devicePublicId, query.data]);

  return {
    ...query,
    position,
  };
};
