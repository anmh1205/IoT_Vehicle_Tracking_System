import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { mapServices } from '@/lib/api/map';
import { localizeAlertTitle } from '@/lib/api/alerts';
import { parseMapTimestamp } from '@/features/map/constants/map-config';
import { useMapStore } from '@/features/map/store/map-store';
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

export const useDevicePositions = () => {
  const updateBatch = useMapStore((state) => state.updateBatch);

  const query = useQuery({
    queryKey: ['device-positions'],
    queryFn: () => mapServices.getPositions(),
    refetchInterval: 2_000,
  });

  useEffect(() => {
    const rows =
      query.data?.items ?? query.data?.data?.items ?? query.data?.data ?? query.data ?? [];
    if (!Array.isArray(rows)) {
      return;
    }
    updateBatch(rows.map(toDevicePosition));
  }, [query.data, updateBatch]);

  return query;
};
