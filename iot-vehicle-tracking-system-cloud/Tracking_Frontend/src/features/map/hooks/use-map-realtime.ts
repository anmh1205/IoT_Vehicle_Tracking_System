import { useCallback, useEffect, useRef } from 'react';
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription';
import { localizeAlertTitle } from '@/lib/api/alerts';
import { parseMapTimestamp } from '@/features/map/constants/map-config';
import { useMapStore } from '@/features/map/store/map-store';
import { MAP_REALTIME_THROTTLE_MS } from '@/features/map/constants/map-config';
import type { DevicePosition } from '@/features/map/types';

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const localizeAlertTitles = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => localizeAlertTitle(String(item ?? '').trim()))
    .filter((item): item is string => Boolean(item));
};

const toAlertSummary = (raw: any, source: 'device' | 'ecu'): DevicePosition['deviceAlerts'] => ({
  source,
  count: Number(raw?.count ?? 0),
  highestSeverity: (raw?.highestSeverity ?? raw?.highest_severity ?? 'none') as DevicePosition['deviceAlerts']['highestSeverity'],
  titles: localizeAlertTitles(raw?.titles),
});

const toDevicePosition = (raw: any): DevicePosition => ({
  deviceId: String(raw?.deviceId ?? ''),
  deviceName: String(raw?.deviceName ?? raw?.deviceId ?? 'Unknown'),
  vehicleId: raw?.vehicleId ?? null,
  vehiclePlate: raw?.vehiclePlate ?? null,
  customerName: raw?.customerName ?? null,
  lat: Number(raw?.latitude ?? Number.NaN),
  lon: Number(raw?.longitude ?? Number.NaN),
  speed: Number(raw?.speed ?? Number.NaN),
  heading: Number(raw?.course ?? Number.NaN),
  status: (raw?.status ?? raw?.currentStatus ?? 'disconnected') as DevicePosition['status'],
  ignitionState: (raw?.ignitionState ?? null) as DevicePosition['ignitionState'],
  motionState: (raw?.motionState ?? null) as DevicePosition['motionState'],
  vehicleState: (raw?.vehicleState ?? null) as DevicePosition['vehicleState'],
  deviceState: (raw?.deviceState ?? null) as DevicePosition['deviceState'],
  sleepMode: (raw?.sleepMode ?? null) as DevicePosition['sleepMode'],
  stateUpdatedAt: raw?.stateUpdatedAt ?? null,
  timestamp: parseMapTimestamp(raw?.timestamp ?? raw?.lastSeenAt),
  battery: toNullableNumber(raw?.vehicleBattery),
  deviceBattery: toNullableNumber(raw?.deviceBattery),
  vehicleBattery: toNullableNumber(raw?.vehicleBattery),
  satellites: toNullableNumber(raw?.satellites),
  vibration: toNullableNumber(raw?.vibration),
  errorCode: toNullableNumber(raw?.errorCode),
  temperature: toNullableNumber(raw?.temperature),
  engineTemperature: toNullableNumber(raw?.engineTemperature),
  rpm: toNullableNumber(raw?.rpm),
  activeAlertCount: Number(raw?.activeAlertCount ?? 0),
  activeAlertTitles: localizeAlertTitles(raw?.activeAlertTitles),
  deviceAlerts: toAlertSummary(raw?.deviceAlerts ?? {}, 'device'),
  ecuAlerts: toAlertSummary(raw?.ecuAlerts ?? {}, 'ecu'),
});

const isOlderPosition = (
  next: DevicePosition,
  previous: DevicePosition | undefined,
): boolean =>
  next.timestamp !== null && previous?.timestamp != null && next.timestamp < previous.timestamp;

const mergePosition = (
  next: DevicePosition,
  previous: DevicePosition | undefined,
): DevicePosition => ({
  ...previous,
  ...next,
  deviceId: next.deviceId || previous?.deviceId || '',
  deviceName: next.deviceName || previous?.deviceName || 'Unknown',
  vehicleId: next.vehicleId ?? previous?.vehicleId ?? null,
  vehiclePlate: next.vehiclePlate ?? previous?.vehiclePlate ?? null,
  customerName: next.customerName ?? previous?.customerName ?? null,
  lat: Number.isFinite(next.lat) ? next.lat : (previous?.lat ?? Number.NaN),
  lon: Number.isFinite(next.lon) ? next.lon : (previous?.lon ?? Number.NaN),
  speed: Number.isFinite(next.speed) ? next.speed : (previous?.speed ?? Number.NaN),
  heading: Number.isFinite(next.heading) ? next.heading : (previous?.heading ?? Number.NaN),
  status: next.status ?? previous?.status ?? 'disconnected',
  ignitionState: next.ignitionState ?? previous?.ignitionState ?? null,
  motionState: next.motionState ?? previous?.motionState ?? null,
  vehicleState: next.vehicleState ?? previous?.vehicleState ?? null,
  deviceState: next.deviceState ?? previous?.deviceState ?? null,
  sleepMode: next.sleepMode ?? previous?.sleepMode ?? null,
  stateUpdatedAt: next.stateUpdatedAt ?? previous?.stateUpdatedAt ?? null,
  timestamp: next.timestamp ?? previous?.timestamp ?? null,
  battery: next.battery ?? previous?.battery ?? null,
  deviceBattery: next.deviceBattery ?? previous?.deviceBattery ?? null,
  vehicleBattery: next.vehicleBattery ?? previous?.vehicleBattery ?? null,
  satellites: next.satellites ?? previous?.satellites ?? null,
  vibration: next.vibration ?? previous?.vibration ?? null,
  errorCode: next.errorCode ?? previous?.errorCode ?? null,
  temperature: next.temperature ?? previous?.temperature ?? null,
  engineTemperature: next.engineTemperature ?? previous?.engineTemperature ?? null,
  rpm: next.rpm ?? previous?.rpm ?? null,
  activeAlertCount: next.activeAlertCount ?? previous?.activeAlertCount ?? 0,
  activeAlertTitles: next.activeAlertTitles ?? previous?.activeAlertTitles ?? [],
  deviceAlerts: next.deviceAlerts ?? previous?.deviceAlerts ?? {
    source: 'device',
    count: 0,
    highestSeverity: 'none',
    titles: [],
  },
  ecuAlerts: next.ecuAlerts ?? previous?.ecuAlerts ?? {
    source: 'ecu',
    count: 0,
    highestSeverity: 'none',
    titles: [],
  },
});

export const useMapRealtime = () => {
  const updateBatch = useMapStore((state) => state.updateBatch);
  const bufferRef = useRef<Map<string, DevicePosition>>(new Map());

  const enqueuePosition = useCallback((payload: any) => {
    const position = toDevicePosition(payload);
    if (!position.deviceId) {
      return;
    }
    const buffered = bufferRef.current.get(position.deviceId);
    const existing = useMapStore.getState().positions.get(position.deviceId);
    const previous = buffered ?? existing;
    if (isOlderPosition(position, previous)) {
      return;
    }
    bufferRef.current.set(position.deviceId, mergePosition(position, previous));
  }, []);

  useRealtimeSubscription({
    namespace: 'devices',
    event: 'device:position',
    handler: enqueuePosition,
  });

  useRealtimeSubscription({
    namespace: 'devices',
    event: 'device:status',
    handler: enqueuePosition,
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      const buffered = Array.from(bufferRef.current.values());
      if (buffered.length === 0) {
        return;
      }
      updateBatch(buffered);
      bufferRef.current.clear();
    }, MAP_REALTIME_THROTTLE_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [updateBatch]);
};
